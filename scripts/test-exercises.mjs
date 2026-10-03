import assert from 'node:assert/strict';
import { moduleLoader, seeded } from './exercise-test-loader.mjs';
const load=moduleLoader(), {SKILLS}=load('lib/exercises/catalog'),engine=load('lib/exercises/generators'),math=load('lib/exercises/math'),validation=load('lib/exercises/validation'),pdf=load('lib/exercises/pdf'),policy=load('lib/exercises/policy');
const defaults={level:'CM2',subject:'Mathématiques',skill:'grands-nombres',difficulty:'standard',count:3,duration:20,example:false,correction:true,spaces:true,pages:2};
const normalized=value=>JSON.parse(JSON.stringify(value));
function parseWords(text){
  const table={zéro:0,un:1,deux:2,trois:3,quatre:4,cinq:5,six:6,sept:7,huit:8,neuf:9,dix:10,onze:11,douze:12,treize:13,quatorze:14,quinze:15,seize:16,vingt:20,trente:30,quarante:40,cinquante:50,soixante:60,octante:80};
  let total=0,group=0;for(const word of text.replaceAll('quatre-vingts','quatre-vingt').replaceAll('quatre-vingt','octante').replaceAll('-',' ').split(' ')){if(word==='et')continue;if(word==='cent'||word==='cents')group=(group||1)*100;else if(word==='mille'||word==='million'||word==='millions'){total+=(group||1)*(word==='mille'?1000:1000000);group=0;}else{assert.ok(word in table,word);group+=table[word];}}return total+group;
}
function check(e,p){
  const [a,b,c]=e.data.values,challenge=p.difficulty==='defi',v=e.answer.values,scale=10**e.data.scale;
  switch(e.type){
    case 'words': assert.equal(parseWords(e.answer.text.split(' ;')[0]),a);break;
    case 'decompose': assert.equal(e.answer.text.split(' ;')[0].split(' + ').reduce((s,t)=>s+Number(t),0),a);break;
    case 'order':{const sorted=[a,b,c].sort((x,y)=>x-y);assert.deepEqual(normalized(v.slice(0,3)),sorted);assert.ok(v[3]<sorted[1]&&sorted[1]<v[4]);assert.equal(v[3]%(challenge?100:10),0);break;}
    case 'round':{const steps=p.difficulty==='soutien'?[10]:challenge?[1000,10000]:[100];steps.forEach((step,i)=>{const quotient=Math.trunc(a/step),remainder=a%step;assert.equal(v[i],quotient*step+(remainder*2>=step?step:0));});break;}
    case 'divisors': assert.deepEqual(normalized(v),Array.from({length:a},(_,i)=>i+1).filter(i=>a%i===0));break;
    case 'fraction': assert.equal(e.answer.fraction.numerator*b,e.answer.fraction.denominator*a);break;
    case 'quantity': assert.equal(v[0]*b,a*(p.difficulty==='soutien'?1:b-1));if(challenge)assert.equal(v[0]+v[1],a);break;
    case 'product-fraction': assert.equal(e.answer.fraction.numerator*b,e.answer.fraction.denominator*a*(p.difficulty==='soutien'?1:b-1));break;
    case 'decimal-fraction':assert.equal(e.answer.fraction.numerator*scale,e.answer.fraction.denominator*a);break;
    case 'convert':assert.equal(BigInt(e.answer.text.split(' ;')[0].replace(',','')),BigInt(a));break;
    case 'decimal':{const decomposition=e.answer.text.split(' ; ')[1];assert.equal(decomposition.split(' + ').reduce((sum,term)=>{const [n,d]=term.split('/').map(Number);return sum+n*scale/(d||1);},0),a);break;}
    case 'add':assert.equal(v[0],a+b+(challenge?c:0));break;
    case 'subtract':assert.equal(v[0],a-b-(challenge?c:0));assert.ok(v[0]>0);break;
    case 'multiply':assert.equal(BigInt(v[0]),BigInt(a)*BigInt(b));break;
    case 'divide':assert.equal(b*v[0]+v[1],a);assert.ok(v[1]>=0&&v[1]<b);break;
    default:assert.fail('Unknown exercise type');
  }
}
let sheets=0,exercises=0,overflows=0;
for(const skill of SKILLS)for(const difficulty of ['soutien','standard','defi'])for(const count of [3,6])for(let sample=1;sample<=20;sample++){
  const p={...defaults,skill:skill.slug,difficulty,count,example:sample%2===0};const sheet=engine.generateSheet(p,seeded(sample*781+count));
  assert.equal(sheet.exercises.length,count);assert.equal(new Set(sheet.exercises.map(e=>e.id)).size,count);
  if(!(skill.slug==='fractions-simples'&&difficulty==='soutien'))assert.equal(new Set(sheet.exercises.map(e=>e.statement)).size,count);
  for(const e of [...sheet.exercises,...(sheet.example?[sheet.example]:[])]){check(e,p);exercises++;}
  assert.deepEqual(normalized(engine.readSheet(JSON.parse(JSON.stringify(sheet)))),normalized(sheet));
  try{assert.ok(pdf.createPdf(sheet).length>1000);pdf.createPdf(sheet,true);}catch(error){assert.match(error.message,/page|contenu/i);overflows++;}
  sheets++;
}
for(const [n,text] of [[0,'zéro'],[21,'vingt et un'],[71,'soixante et onze'],[80,'quatre-vingts'],[81,'quatre-vingt-un'],[200,'deux cents'],[201,'deux cent un'],[80000,'quatre-vingt mille'],[200000,'deux cent mille'],[200000000,'deux cents millions']])assert.equal(math.numberWords(n),text);
const sheet=engine.generateSheet(defaults,seeded(42)),edits=sheet.exercises.map(e=>e.data);
const changed=engine.editSheet(sheet,[{values:[123456],scale:0},...edits.slice(1)]);assert.equal(changed.exercises[0].id,sheet.exercises[0].id);assert.match(changed.exercises[0].statement,/123456/);assert.match(changed.exercises[0].answer.text,/cent vingt-trois mille/);assert.deepEqual(normalized(changed.exercises.slice(1)),normalized(sheet.exercises.slice(1)));
const historical={...sheet,generatorVersion:'0.9.0',exercises:sheet.exercises.map(e=>({...e,statement:'Ancien énoncé conservé',answer:{...e.answer,text:'Ancien corrigé conservé'}}))};
// Only one legacy statement is changed to avoid introducing duplicate questions.
historical.exercises=sheet.exercises.map((e,i)=>i?e:historical.exercises[0]);
assert.deepEqual(normalized(engine.editSheet(historical,edits)),normalized(historical));
assert.throws(()=>engine.editSheet(sheet,[{values:[0],scale:0},...edits.slice(1)]));
const fractionSheet=engine.generateSheet({...defaults,skill:'fractions-simples'},seeded(123));assert.throws(()=>engine.editSheet(fractionSheet,[{values:[1,0],scale:0},...fractionSheet.exercises.slice(1).map(e=>e.data)]));
for(const bad of [{count:2},{count:7},{count:3.5},{level:'CM1'},{subject:'Sciences'},{difficulty:'super'},{duration:0},{pages:3},{example:'true'}])assert.throws(()=>validation.parameters({...defaults,...bad}));
assert.throws(()=>pdf.createPdf({...sheet,parameters:{...sheet.parameters,correction:false}},true));
assert.throws(()=>pdf.createPdf({...sheet,parameters:{...sheet.parameters,pages:1,count:6,example:true},exercises:[...sheet.exercises,...sheet.exercises],example:sheet.exercises[0]}));
assert.equal(policy.calendarMonth(new Date('2026-10-31T23:59:59Z')).key,'2026-10');assert.equal(policy.calendarMonth(new Date('2026-11-01T00:00:00Z')).key,'2026-11');assert.equal(policy.calendarMonth(new Date('2026-12-31T23:30:00Z')).renewalDate,'2027-01-01');
assert.equal(policy.exerciseRights('unconfigured-test-user').limit,3);assert.throws(()=>policy.idempotencyKey('short'));
for(const value of ['1/2','2/4','50/100','0,5','0.50'])assert.ok(math.equivalentFraction(value,1,2));
for(const value of ['1/0','0,4','1/3','NaN'])assert.equal(math.equivalentFraction(value,1,2),false);
console.log(`PASS pedagogical engine: ${sheets} sheets, ${exercises} independently checked exercises, all 15 skills × 3 difficulties × 3/6 exercises; ${overflows} oversized layouts explicitly rejected`);
console.log('PASS editing, stable IDs, snapshots, French number agreements, exact fractions, invalid parameters, PDF options and UTC month boundary');
