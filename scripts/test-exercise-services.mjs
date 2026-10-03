import assert from 'node:assert/strict';
import { moduleLoader } from './exercise-test-loader.mjs';
// Executes the real services/routes against a transactional in-memory test double.
// It is NOT a PostgreSQL, Clerk or Worker integration test.
let state={sheets:[],usage:{},windows:{},classes:[{id:'class-a',teacherId:'teacher-a',level:'CM2',schoolYear:'2026-2027'}],sessions:[]},queue=Promise.resolve(),failure=false,identity={id:'teacher-a'};
let locked=false;
const key=o=>Object.values(o).join('|');
const matches=(record,where)=>Object.entries(where).every(([k,v])=>typeof v==='object'&&v!==null?(v.lt?record[k]<v.lt:record[k]===v):record[k]===v);
const prisma={
  exerciseSheet:{
    findUnique:async({where})=>state.sheets.find(s=>matches(s,where.teacherId_generationKey??where.id_teacherId??where))??null,
    findFirst:async({where})=>state.sheets.find(s=>matches(s,where))??null,
    findMany:async({where})=>state.sheets.filter(s=>matches(s,where)),
    create:async({data})=>{assert.ok(locked);if(failure)throw new Error('Injected storage failure');const record={id:`sheet-${state.sheets.length+1}`,revision:1,savedAt:null,createdAt:new Date(),updatedAt:new Date(),...data};state.sheets.push(record);return structuredClone(record);},
    update:async({where,data})=>{assert.ok(locked);const record=state.sheets.find(s=>matches(s,where.id_teacherId));assert.ok(record);Object.assign(record,{...data,revision:record.revision+data.revision.increment});return structuredClone(record);},
  },
  exerciseUsage:{
    findUnique:async({where})=>state.usage[key(where.teacherId_monthKey)]??null,
    upsert:async({where,create})=>{assert.ok(locked);const k=key(where.teacherId_monthKey);return state.usage[k]??(state.usage[k]={...create});},
    update:async({where,data})=>{assert.ok(locked);const item=state.usage[key(where.teacherId_monthKey)];item.count+=data.count.increment;return item;},
  },
  exerciseRequestWindow:{
    upsert:async({where,create})=>{const k=key(where.teacherId_bucket),item=state.windows[k];if(item){item.count++;return item;}return state.windows[k]={...create};},
    deleteMany:async()=>({count:0}),
  },
  schoolClass:{findFirst:async({where})=>state.classes.find(s=>matches(s,where))??null},
  journalSession:{
    findMany:async({where})=>state.sessions.filter(s=>matches(s,where)),
    upsert:async({where,create})=>{const existing=state.sessions.find(s=>Object.entries(where.teacherId_sheetId_classId_date).every(([k,v])=>k==='date'?s[k].getTime()===v.getTime():s[k]===v));if(existing)return existing;const item={id:`session-${state.sessions.length+1}`,...create};state.sessions.push(item);return item;},
  },
  $queryRaw:async(parts,id)=>{assert.match(parts.join('?'),/Teacher.*FOR UPDATE/);assert.ok(['teacher-a','teacher-b'].includes(id));locked=true;return [{id}];},
  $transaction:async work=>{const run=queue.then(async()=>{const before=structuredClone(state);try{return await work(prisma);}catch(error){state=before;throw error;}finally{locked=false;}});queue=run.catch(()=>{});return run;},
};
const load=moduleLoader({'@/lib/prisma':{prisma},'@/lib/current-teacher':{getCurrentTeacher:async()=>identity}}),service=load('lib/exercises/service');
const p={level:'CM2',subject:'Mathématiques',skill:'addition',difficulty:'standard',count:3,duration:20,example:false,correction:true,spaces:true,pages:2};
const requestKey=n=>'test-request-key-'+String(n).padStart(4,'0');
const same=await Promise.all(Array.from({length:10},()=>service.generateForTeacher('teacher-a',p,requestKey(1))));
assert.equal(new Set(same.map(s=>s.id)).size,1);assert.equal(await service.getMonthlyGenerationCount('teacher-a'),1);
await assert.rejects(service.generateForTeacher('teacher-a',{...p,count:6},requestKey(1)),error=>error.status===409);
const concurrent=await Promise.allSettled([2,3,4,5,6].map(n=>service.generateForTeacher('teacher-a',p,requestKey(n))));
assert.equal(concurrent.filter(s=>s.status==='fulfilled').length,2);assert.equal(await service.getMonthlyGenerationCount('teacher-a'),3);
await assert.rejects(service.getOwnedSheet('teacher-b',same[0].id),error=>error.status===404);
const first=await service.getOwnedSheet('teacher-a',same[0].id),data=first.snapshot.exercises.map(e=>e.data);
await assert.rejects(service.updateSheet('teacher-b',first.id,{revision:first.revision,edits:data}),error=>error.status===404);
const saved=await service.updateSheet('teacher-a',first.id,{revision:first.revision,edits:data});assert.ok(saved.savedAt);assert.equal(saved.revision,2);
const original=JSON.stringify(saved.snapshot.exercises.slice(1));
const regen=await service.updateSheet('teacher-a',saved.id,{revision:saved.revision,edits:data},0);
assert.equal(JSON.stringify(regen.snapshot.exercises.slice(1)),original);assert.equal(regen.snapshot.exercises[0].id,saved.snapshot.exercises[0].id);assert.notEqual(regen.snapshot.exercises[0].statement,saved.snapshot.exercises[0].statement);
assert.equal(await service.getMonthlyGenerationCount('teacher-a'),3);
await assert.rejects(service.updateSheet('teacher-a',saved.id,{revision:saved.revision,edits:data}),error=>error.status===409);
failure=true;await assert.rejects(service.generateForTeacher('teacher-b',p,requestKey(7)));assert.equal(await service.getMonthlyGenerationCount('teacher-b'),0);failure=false;
const b=await service.generateForTeacher('teacher-b',p,requestKey(7));assert.equal(b.teacherId,'teacher-b');assert.equal(await service.getMonthlyGenerationCount('teacher-b'),1);
// Prior months cannot exhaust the current month.
state.usage['teacher-b|2000-01']={teacherId:'teacher-b',monthKey:'2000-01',count:3};assert.equal(await service.getMonthlyGenerationCount('teacher-b'),1);
const api=load('app/api/exercises/[id]/route'),pdfApi=load('app/api/exercises/[id]/pdf/route'),quotaApi=load('app/api/exercises/quota/route'),generationApi=load('app/api/exercises/route'),journal=load('app/api/journal/route');
const context={params:Promise.resolve({id:saved.id})};
identity=null;for(const handler of [api.GET,pdfApi.GET])assert.equal((await handler(new Request('http://localhost/api/exercises/'+saved.id),context)).status,401);
assert.equal((await generationApi.POST(new Request('http://localhost/api/exercises',{method:'POST'}))).status,401);assert.equal((await quotaApi.GET()).status,401);
identity={id:'teacher-b'};assert.equal((await api.GET(null,context)).status,404);assert.equal((await pdfApi.GET(new Request('http://localhost/api/exercises/'+saved.id+'/pdf'),context)).status,404);
identity={id:'teacher-a'};
const output=await pdfApi.GET(new Request('http://localhost/api/exercises/'+saved.id+'/pdf?revision='+regen.revision),context);assert.equal(output.status,200);assert.equal(output.headers.get('content-type'),'application/pdf');assert.match(output.headers.get('content-disposition'),/attachment/);assert.ok(new TextDecoder().decode(await output.arrayBuffer()).startsWith('%PDF-1.4'));
assert.equal((await pdfApi.GET(new Request('http://localhost/api/exercises/'+saved.id+'/pdf?revision=1'),context)).status,409);
const post=payload=>new Request('http://localhost/api/journal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
const linked={sheetId:saved.id,classId:'class-a',date:'2026-10-05'};
assert.equal((await journal.POST(post(linked))).status,201);assert.equal((await journal.POST(post(linked))).status,201);assert.equal(state.sessions.length,1);
assert.equal((await journal.POST(post({...linked,classId:'class-b'}))).status,404);
identity={id:'teacher-b'};assert.equal((await journal.POST(post(linked))).status,404);assert.deepEqual(await (await journal.GET()).json(),[]);
identity={id:'teacher-a'};
const fingerprint=JSON.stringify(state.sheets);const usage=await service.getMonthlyGenerationCount('teacher-a');
state.windows['teacher-a|'+new Date().toISOString().slice(0,16)]={count:30};
const current=await service.getOwnedSheet('teacher-a',saved.id);
await assert.rejects(service.updateSheet('teacher-a',saved.id,{revision:current.revision,edits:current.snapshot.exercises.map(e=>e.data)},0),error=>error.status===429);
assert.equal(JSON.stringify(state.sheets),fingerprint);assert.equal(await service.getMonthlyGenerationCount('teacher-a'),usage);
console.log('PASS real services against test double: concurrent idempotency, 3/month quota, rollback and retry, month isolation, owner filtering, revisions, regeneration and rate limits');
console.log('PASS API routes against test double: anonymous denial, cross-account direct/PDF denial, true PDF attachment, stale export refusal, journal ownership and idempotent linking');
