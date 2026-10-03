// Isolated regression checks: actual TSX/route handlers, simulated React hooks,
// authentication and storage. This does not replace browser/PostgreSQL tests.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, imports, globals = {}) {
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, {
    exports, require(name) {
      if (!(name in imports)) throw new Error(`Unexpected dependency: ${name}`);
      return imports[name];
    }, Response, Request, URLSearchParams, console, ...globals,
  }, { filename: path });
  return exports;
}

const planning = load('lib/planning.ts', {});
const profile = load('lib/profile-input.ts', {});
const validation = load('lib/repartition-input.ts', { './planning': planning, './profile-input': profile });
const fixture = {
  id: 'document-a', type: 'annuelle', classId: 'class-a', country: 'Maroc',
  schoolYear: '2026-2027', level: 'CM2', lessonsPerWeek: 5,
  startDate: '2026-09-07', endDate: '2026-09-11', sessionMinutes: 45,
  vacations: '', syllabus: 'Unité 1\nAddition', validatedAt: '2026-10-02T12:00:00Z',
  rows: [{ week: 1, startDate: '2026-09-07', endDate: '2026-09-11', unit: 'Unité 1', lessons: 'Addition', sessions: 1 }],
};
const flush = () => new Promise(resolve => setImmediate(resolve));

async function interfaceChecks() {
  let cursor = 0, initialized = false, effects = [], writes = [], printed = 0, deferSave;
  const slots = [];
  let stored = structuredClone(fixture);
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
    },
    useRef(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = { current: initial };
      return slots[i];
    },
    useEffect(effect) { if (!initialized) effects.push(effect); },
  };
  const jsx = (type, props) => ({ type, props });
  const page = load('app/repartition/lecons/page.tsx', {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'next/link': { default: 'a' }, '@/lib/planning': planning,
  }, {
    window: { location: { search: '?id=document-a' }, history: { replaceState() {} }, print() { printed++; } },
    async fetch(url, options) {
      if (!options) return { ok: true, json: async () => url === '/api/classes' ? [] : structuredClone(stored) };
      const payload = JSON.parse(options.body);
      writes.push(payload);
      if (deferSave) await deferSave;
      stored = { ...stored, ...payload, validatedAt: payload.validated ? '2026-10-02T13:00:00Z' : null };
      return { ok: true, json: async () => structuredClone(stored) };
    },
  }).default;
  function render() { cursor = 0; const tree = page(); initialized = true; return tree; }
  function nodes(tree) {
    if (!tree || typeof tree !== 'object') return [];
    if (Array.isArray(tree)) return tree.flatMap(nodes);
    return [tree, ...nodes(tree.props?.children)];
  }
  const button = (tree, label) => nodes(tree).find(n => n.type === 'button' && n.props.children === label);
  const input = (tree, label) => nodes(tree).find(n => n.props?.['aria-label'] === label);
  const preview = tree => nodes(tree).find(n => n.props?.className?.startsWith('planning-preview'));
  function edit(tree, label, value) {
    const event = { target: { value, closest: () => ({}) } };
    tree.props.onChangeCapture(event);
    input(tree, label).props.onChange(event);
  }
  let tree = render();
  effects.forEach(effect => effect());
  await flush();
  tree = render();
  assert.equal(preview(tree).props['data-validated'], true);
  const oldPrint = button(tree, 'Exporter le PDF A4').props.onClick;
  for (const [label, value] of [['Unité semaine 1', 'Unité modifiée'], ['Leçons semaine 1', 'Soustraction'], ['Séances semaine 1', '2']]) {
    edit(tree, label, value);
    tree = render();
    assert.equal(input(tree, label).props.value, label.startsWith('Séances') ? 2 : value);
    assert.equal(preview(tree).props['data-validated'], false);
    for (const text of ['Exporter le PDF A4', 'Télécharger en Excel (paysage)', 'Télécharger en Word (paysage)']) {
      assert.equal(button(tree, text).props.disabled, true);
    }
  }
  oldPrint();
  assert.equal(printed, 0, 'even a stale print callback must be blocked');
  assert.equal(writes.length, 0, 'editing must not write to storage');
  button(tree, 'Enregistrer le brouillon').props.onClick();
  await flush();
  assert.equal(writes.length, 1);
  assert.equal(writes[0].validated, false);
  assert.equal(stored.validatedAt, null);
  assert.equal(stored.rows[0].lessons, 'Soustraction');
  tree = render();
  let release;
  deferSave = new Promise(resolve => { release = resolve; });
  const save = button(tree, 'Valider et enregistrer').props.onClick;
  save(); save();
  assert.equal(writes.length, 2, 'double click must issue only one additional write');
  edit(tree, 'Leçons semaine 1', 'Division'); // adversarial change during pending request
  release(); await flush();
  tree = render();
  assert.equal(preview(tree).props['data-validated'], false, 'stale response must not validate newer edits');
  assert.equal(input(tree, 'Leçons semaine 1').props.value, 'Division');
  deferSave = null;
  button(tree, 'Valider et enregistrer').props.onClick(); await flush();
  tree = render();
  assert.equal(preview(tree).props['data-validated'], true);
  button(tree, 'Exporter le PDF A4').props.onClick();
  assert.equal(printed, 1);
  // Remount: values and validation come from stored response, not the old hooks.
  slots.length = 0; initialized = false; effects = [];
  render(); effects.forEach(effect => effect()); await flush(); tree = render();
  assert.equal(input(tree, 'Leçons semaine 1').props.value, 'Division');
  assert.equal(preview(tree).props['data-validated'], true);
  console.log('PASS interface: edits retained, all exports blocked, no automatic writes, double click, stale save, revalidation and simulated reload');
}

async function apiChecks() {
  let teacher = { id: 'teacher-a' }, writes = 0;
  let record = { ...structuredClone(fixture), teacherId: 'teacher-a' };
  const owned = where => record && where.id === record.id && where.teacherId === record.teacherId;
  const api = load('app/api/repartitions/[id]/route.ts', {
    '@/lib/current-teacher': { getCurrentTeacher: async () => teacher },
    '@/lib/repartition-input': validation,
    '@/lib/repartition-class': { ownsPlanningClass: async (id, data) => id === 'teacher-a' && data.classId === 'class-a' },
    '@/lib/prisma': { prisma: { repartition: {
      findFirst: async ({ where }) => owned(where) ? structuredClone(record) : null,
      update: async ({ where, data }) => {
        assert.ok(owned(where)); writes++;
        record = { ...record, ...data, rows: data.rows.create }; return structuredClone(record);
      },
      deleteMany: async ({ where }) => ({ count: owned(where) ? 1 : 0 }),
    } } },
  });
  const context = { params: Promise.resolve({ id: fixture.id }) };
  const request = validated => new Request('http://localhost/api/repartitions/document-a', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...fixture, validated, rows: [{ ...fixture.rows[0], lessons: 'Division' }] }),
  });
  assert.equal((await api.PUT(request(false), context)).status, 200);
  let saved = await (await api.GET(null, context)).json();
  assert.equal(saved.validatedAt, null);
  assert.equal(saved.rows[0].lessons, 'Division');
  assert.equal((await api.PUT(request(true), context)).status, 200);
  saved = await (await api.GET(null, context)).json();
  assert.ok(saved.validatedAt);
  assert.equal(writes, 2);
  teacher = { id: 'teacher-b' };
  assert.equal((await api.GET(null, context)).status, 404);
  assert.equal((await api.PUT(request(false), context)).status, 400);
  assert.equal((await api.DELETE(null, context)).status, 404);
  assert.equal(writes, 2);
  teacher = null;
  assert.equal((await api.GET(null, context)).status, 401);
  assert.equal((await api.PUT(request(false), context)).status, 401);
  assert.equal((await api.DELETE(null, context)).status, 401);
  console.log('PASS API handlers: draft clears validatedAt, explicit validation, simulated readback, owner filters, anonymous denial');
}

function planningChecks() {
  const lessons = Array.from({ length: 5 }, (_, i) => ({ unite: 'Unité 1', lecon: `Leçon ${i + 1}` }));
  const generate = (start, end, weekly, vacations = '', count = 1) => planning.generatePlanning(start, end, weekly, vacations, lessons.slice(0, count));
  for (const weekly of [1, 2, 5, 40]) {
    const rows = generate('2026-09-07', '2026-09-11', weekly);
    assert.equal(rows[0].sessions, 1);
  }
  assert.equal(planning.capacity(planning.parseDate('2026-09-09'), planning.parseDate('2026-09-11'), [], 2), 1);
  assert.throws(() => generate('2026-09-09', '2026-09-11', 1), /Charge excessive/);
  assert.equal(generate('2026-09-09', '2026-09-11', 2)[0].sessions, 1);
  assert.throws(() => generate('2026-09-12', '2026-09-13', 5), /Charge excessive/);
  assert.throws(() => generate('2026-09-07', '2026-09-11', 5, '07/09/2026 au 11/09/2026'), /Charge excessive/);
  assert.equal(generate('2026-09-07', '2026-09-11', 5, '07/09/2026 au 08/09/2026', 3)[0].sessions, 3);
  assert.throws(() => generate('2026-09-07', '2026-09-11', 5, '07/09/2026 au 09/09/2026\n09/09/2026 au 11/09/2026'), /chevauchent/);
  assert.throws(() => generate('2026-09-07', '2026-09-11', 5, '01/09/2026 au 02/09/2026'), /compris/);
  for (const weekly of [0, 41, 1.5]) assert.throws(() => generate('2026-09-07', '2026-09-11', weekly), /1 à 40/);
  assert.equal(planning.parseDate('2026-02-30'), null);
  const partial = { ...fixture, validated: true, startDate: '2026-09-09', rows: [{ ...fixture.rows[0], startDate: '2026-09-09', sessions: 2 }], lessonsPerWeek: 2 };
  assert.equal(validation.validateRepartitionInput(partial), null, 'server must reject overload in a partial week');
  assert.ok(validation.validateRepartitionInput({ ...partial, rows: [{ ...partial.rows[0], sessions: 1 }] }));
  const annual = generate('2026-09-01', '2027-07-01', 5, '', 5);
  assert.ok(annual.length > 40);
  assert.equal(annual.reduce((total, row) => total + row.sessions, 0), 5);
  console.log('PASS planning: rhythms, partial weeks, weekends, holidays, overlaps, overload and annual generation');
}

async function classChecks() {
  let teacher = { id: 'teacher-a' }, writes = 0;
  const record = { id: 'class-a', teacherId: 'teacher-a', name: 'CM2 test', level: 'CM2', country: 'Maroc', schoolYear: '2026-2027' };
  const prisma = { schoolClass: {
    findFirst: async ({ where }) => Object.entries(where).every(([key, value]) => record[key] === value) ? { id: record.id } : null,
    updateMany: async ({ where, data }) => {
      if (where.id !== record.id || where.teacherId !== record.teacherId) return { count: 0 };
      Object.assign(record, data); writes++; return { count: 1 };
    },
  } };
  const ownership = load('lib/repartition-class.ts', { '@/lib/prisma': { prisma } });
  const original = { classId: record.id, level: record.level, country: record.country, schoolYear: record.schoolYear };
  assert.ok(await ownership.ownsPlanningClass(teacher.id, original));
  assert.equal(await ownership.ownsPlanningClass('teacher-b', original), null);
  const api = load('app/api/classes/[id]/route.ts', {
    '@/lib/current-teacher': { getCurrentTeacher: async () => teacher },
    '@/lib/prisma': { prisma }, '@/lib/profile-input': profile,
  });
  const request = data => new Request('http://localhost/api/classes/class-a', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const context = { params: Promise.resolve({ id: record.id }) };
  teacher = { id: 'teacher-b' };
  assert.equal((await api.PUT(request({ ...record, level: 'CM1' }), context)).status, 404);
  assert.equal(writes, 0);
  teacher = null;
  assert.equal((await api.PUT(request(record), context)).status, 401);
  teacher = { id: 'teacher-a' };
  assert.equal((await api.PUT(request({ ...record, level: 'CP' }), context)).status, 400);
  for (const data of [{ level: 'CM1' }, { country: 'France' }, { schoolYear: '2027-2028' }]) {
    Object.assign(record, { level: original.level, country: original.country, schoolYear: original.schoolYear });
    assert.equal((await api.PUT(request({ ...record, ...data }), context)).status, 200);
    assert.equal(await ownership.ownsPlanningClass(teacher.id, original), null, 'changed class must reject incompatible planning');
    assert.ok(await ownership.ownsPlanningClass(teacher.id, { ...original, ...data }));
  }
  console.log('PASS classes: anonymous denial, owner isolation, invalid level and planning compatibility after class changes (simulated storage)');
}

(async () => { planningChecks(); await classChecks(); await interfaceChecks(); await apiChecks(); })().catch(error => { console.error(error); process.exitCode = 1; });
