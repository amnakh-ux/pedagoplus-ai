import assert from 'node:assert/strict';
import { moduleLoader, seeded } from './exercise-test-loader.mjs';
// Actual client component with simulated React hooks/network: no browser claim.
let slots=[],cursor=0,writes=[],pending,consent=true,failGeneration=false;
const events=new Map(),storage=new Map();
const react={useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];},useRef(initial){const i=cursor++;if(!(i in slots))slots[i]={current:initial};return slots[i];},useEffect(){}};
const jsx=(type,props)=>({type,props});
let saved;
const load=moduleLoader({react,'react/jsx-runtime':{jsx,jsxs:jsx},'next/link':{default:'a'}});
const engine=load('lib/exercises/generators');
const snapshot=engine.generateSheet({level:'CM2',subject:'Mathématiques',skill:'grands-nombres',difficulty:'standard',count:3,duration:20,example:false,correction:true,spaces:true,pages:2},seeded(42));
const originalFetch=globalThis.fetch,originalWindow=globalThis.window,originalDocument=globalThis.document;
// The VM receives globals via imports; expose test-only browser names to its loader.
const browser={location:{},history:{replaceState(){}},confirm:()=>consent,addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:name=>events.delete(name)};
const local={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
// Extend the loader's sandbox explicitly; these overrides are unavailable to the application.
async function fetch(url,options){
  if(!options)return {ok:true,json:async()=>({remaining:2,limit:3,count:1,renewalDate:'2026-11-01',timezone:'UTC'})};
  writes.push({url,...options});if(pending)await pending;
  const payload=JSON.parse(options.body);
  if(url==='/api/exercises'){
    if(failGeneration)return {ok:false,json:async()=>({error:'Réponse indisponible'})};
    saved={...saved,id:'new-sheet',snapshot:engine.generateSheet(payload.parameters,seeded(77)),revision:1,savedAt:null};
  }else{
    const updated=engine.editSheet(saved.snapshot,payload.edits);
    if(payload.index!==undefined)updated.exercises[payload.index]=engine.generateExercise(updated.parameters,updated.exercises[payload.index].id,updated.exercises,seeded(333));
    saved={...saved,snapshot:updated,revision:saved.revision+1};
  }
  return {ok:true,json:async()=>structuredClone(saved)};
}
const { loadWithGlobals }=await import('./exercise-test-loader.mjs');
const editorLoad=loadWithGlobals({react,'react/jsx-runtime':{jsx,jsxs:jsx},'next/link':{default:'a'}},{window:browser,document:{addEventListener(){},removeEventListener(){}},sessionStorage:local,fetch});
const Editor=editorLoad('components/ExerciseEditor.tsx').default;
saved={id:'sheet-a',revision:1,snapshot,savedAt:'2026-10-03T12:00:00Z',createdAt:'2026-10-03T12:00:00Z',updatedAt:'2026-10-03T12:00:00Z'};
const props={initial:structuredClone(saved),initialError:'',classes:[],quota:{remaining:3,limit:3,count:0,renewalDate:'2026-11-01',timezone:'UTC'}};
const render=()=>{cursor=0;return Editor(props);};
const nodes=tree=>!tree||typeof tree!=='object'?[]:Array.isArray(tree)?tree.flatMap(nodes):[tree,...nodes(tree.props?.children)];
const button=(tree,label)=>nodes(tree).find(n=>n.type==='button'&&n.props.children===label);
const input=tree=>nodes(tree).find(n=>n.props?.['aria-label']==='Exercice 1, donnée 1');
const preview=tree=>nodes(tree).find(n=>n.props?.sheet&&!n.props.correction);
const flush=()=>new Promise(resolve=>setImmediate(resolve));
let tree=render();assert.equal(button(tree,'Télécharger le PDF élève').props.disabled,false);
input(tree).props.onChange({target:{value:'0'}});tree=render();assert.equal(button(tree,'Enregistrer la fiche').props.disabled,true);assert.equal(button(tree,'Télécharger le PDF élève').props.disabled,true);assert.equal(writes.length,0);
input(tree).props.onChange({target:{value:'123456'}});tree=render();assert.match(preview(tree).props.sheet.exercises[0].answer.text,/cent vingt-trois mille/);assert.equal(button(tree,'Télécharger le PDF élève').props.disabled,true);
let release;pending=new Promise(resolve=>{release=resolve;});const save=button(tree,'Enregistrer la fiche').props.onClick;save();save();assert.equal(writes.length,1);tree=render();assert.equal(nodes(tree).find(n=>n.type==='fieldset').props.disabled,true);release();await flush();pending=null;tree=render();assert.equal(button(tree,'Télécharger le PDF élève').props.disabled,false);assert.equal(input(tree).props.value,'123456');
const other=JSON.stringify(saved.snapshot.exercises.slice(1)),id=saved.snapshot.exercises[0].id;
nodes(tree).find(n=>n.type==='button'&&n.props.children==='Régénérer cet exercice').props.onClick();await flush();tree=render();assert.equal(JSON.stringify(saved.snapshot.exercises.slice(1)),other);assert.equal(saved.snapshot.exercises[0].id,id);
consent=false;const before=writes.length;button(tree,'Régénérer la fiche complète').props.onClick();assert.equal(writes.length,before);
consent=true;failGeneration=true;button(tree,'Régénérer la fiche complète').props.onClick();await flush();tree=render();const failedKey=writes.at(-1).headers['Idempotency-Key'];assert.ok(storage.size);
failGeneration=false;const full=button(tree,'Régénérer la fiche complète').props.onClick;full();full();await flush();tree=render();assert.equal(writes.at(-1).headers['Idempotency-Key'],failedKey);assert.equal(storage.size,0);assert.equal(button(tree,'Télécharger le PDF élève').props.disabled,true,'new generation must be saved first');
assert.equal(globalThis.fetch,originalFetch);assert.equal(globalThis.window,originalWindow);assert.equal(globalThis.document,originalDocument);
console.log('PASS actual editor with hook/network simulation: valid corrections, invalid-data refusal, no automatic writes, double click, pending lock, save, partial regeneration, confirmation and persistent retry key');
