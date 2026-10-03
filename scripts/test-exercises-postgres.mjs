import 'dotenv/config';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { moduleLoader } from './exercise-test-loader.mjs';

// Test settings are opt-in and never replace the application's DATABASE_URL.
// Explicit process variables take precedence over the ignored local file.
if(fs.existsSync('.env.test.local')){
  const settings=dotenv.parse(fs.readFileSync('.env.test.local'));
  for(const name of ['EXERCISE_TEST_DATABASE_URL','EXERCISE_TEST_DATABASE_CONFIRMATION']){
    if(process.env[name]===undefined&&settings[name]!==undefined)process.env[name]=settings[name];
  }
}
const url=process.env.EXERCISE_TEST_DATABASE_URL;
if(!url||process.env.EXERCISE_TEST_DATABASE_CONFIRMATION!=='DEDICATED_TEST_DATABASE'){
  console.error('BLOCKED: configure EXERCISE_TEST_DATABASE_URL for a dedicated test database and EXERCISE_TEST_DATABASE_CONFIRMATION=DEDICATED_TEST_DATABASE. No connection or write attempted.');
  process.exit(2);
}
function location(value){try{const parsed=new URL(value);return {host:parsed.hostname.toLowerCase().replace(/-pooler(?=\.)/,''),database:parsed.pathname};}catch{console.error('BLOCKED: invalid test/application connection configuration. No connection details logged.');process.exit(2);}}
const target=location(url);
// Reject the app's current database even when credentials/query strings differ.
const currentUrls=[process.env.DATABASE_URL,...['.env','.env.local','.dev.vars'].filter(file=>fs.existsSync(file)).map(file=>dotenv.parse(fs.readFileSync(file)).DATABASE_URL)].filter(Boolean);
if(currentUrls.some(value=>{const current=location(value);return current.host===target.host&&current.database===target.database;})){
  console.error('BLOCKED: the test database must differ from the application database. No connection or write attempted.');process.exit(2);
}
const prisma=new PrismaClient({adapter:new PrismaNeon({connectionString:url})});
const load=moduleLoader({'@/lib/prisma':{prisma}}),service=load('lib/exercises/service'),{createPdf}=load('lib/exercises/pdf');
const teachers=[];
try{
  // This script applies no migration; prepare the dedicated database separately.
  await prisma.exerciseSheet.count();
  const suffix=crypto.randomUUID();
  for(const label of ['a','b'])teachers.push(await prisma.teacher.create({data:{clerkId:`exercise-test-${label}-${suffix}`,email:`exercise-test-${label}-${suffix}@example.invalid`}}));
  const [a,b]=teachers,p={level:'CM2',subject:'Mathématiques',skill:'addition',difficulty:'standard',count:3,duration:20,example:false,correction:true,spaces:true,pages:2};
  const same=await Promise.all(Array.from({length:5},()=>service.generateForTeacher(a.id,p,`idempotent-${suffix}`)));
  assert.equal(new Set(same.map(s=>s.id)).size,1);assert.equal(await service.getMonthlyGenerationCount(a.id),1);
  const concurrent=await Promise.allSettled(Array.from({length:5},(_,i)=>service.generateForTeacher(a.id,p,`concurrent-${suffix}-${i}`)));
  assert.equal(concurrent.filter(r=>r.status==='fulfilled').length,2);assert.equal(await service.getMonthlyGenerationCount(a.id),3);
  await assert.rejects(service.getOwnedSheet(b.id,same[0].id),e=>e.status===404);
  const sheet=await service.getOwnedSheet(a.id,same[0].id),edits=sheet.snapshot.exercises.map(e=>e.data);
  await assert.rejects(service.updateSheet(b.id,sheet.id,{revision:sheet.revision,edits}),e=>e.status===404);
  const saved=await service.updateSheet(a.id,sheet.id,{revision:sheet.revision,edits});
  const reloaded=await service.getOwnedSheet(a.id,sheet.id);assert.deepEqual(JSON.parse(JSON.stringify(reloaded.snapshot)),JSON.parse(JSON.stringify(saved.snapshot)));assert.ok(reloaded.savedAt);
  const studentPdf=createPdf(reloaded.snapshot),correctionPdf=createPdf(reloaded.snapshot,true);
  assert.equal(Buffer.from(studentPdf).subarray(0,5).toString(),'%PDF-');assert.equal(Buffer.from(correctionPdf).subarray(0,5).toString(),'%PDF-');
  await assert.rejects(service.generateForTeacher(b.id,{...p,pages:1,count:6,example:true},`invalid-layout-${suffix}`));assert.equal(await service.getMonthlyGenerationCount(b.id),0);
  console.log('PASS dedicated PostgreSQL: concurrent row locks, idempotency, 3/month quota, owner isolation, save/reload, stored-snapshot student/correction PDF generation and generation rollback. Not a Clerk/browser test.');
}catch(error){
  const code=error&&typeof error==='object'&&'code'in error?error.code:'test-failure';
  console.error(`FAIL dedicated PostgreSQL (${code}); no connection details logged. Check the dedicated database migrations and test assertion.`);process.exitCode=1;
}finally{
  // Only synthetic teachers created by this invocation can be deleted.
  for(const teacher of teachers)await prisma.teacher.delete({where:{id:teacher.id}}).catch(()=>{console.error('Test-data cleanup failed; no database details logged.');process.exitCode=1;});
  await prisma.$disconnect().catch(()=>{console.error('Test connection cleanup failed.');process.exitCode=1;});
}
