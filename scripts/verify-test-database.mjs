import fs from 'node:fs';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { spawnSync } from 'node:child_process';
import dns from 'node:dns/promises';
import net from 'node:net';

const fail=message=>{console.error(`BLOCKED: ${message}`);process.exit(2);};
if(!fs.existsSync('.env.test.local'))fail('Missing .env.test.local.');
const settings=dotenv.parse(fs.readFileSync('.env.test.local'));
if(settings.EXERCISE_TEST_DATABASE_CONFIRMATION!=='DEDICATED_TEST_DATABASE')fail('Dedicated test confirmation missing or invalid.');
const url=settings.EXERCISE_TEST_DATABASE_URL;
function identity(value){
  try{const u=new URL(value);if(!['postgresql:','postgres:'].includes(u.protocol)||!u.username||!u.password||u.pathname.length<2)throw Error();return {host:u.hostname.toLowerCase().replace(/-pooler(?=\.)/,''),database:u.pathname};}
  catch{fail('Invalid PostgreSQL connection format; no secret logged.');}
}
const target=identity(url);
if(!target.host.endsWith('.neon.tech'))fail('This test runner requires a Neon connection.');
const sources=['.env','.env.local','.dev.vars'].filter(f=>fs.existsSync(f));
const primary=[process.env.DATABASE_URL,...sources.map(f=>dotenv.parse(fs.readFileSync(f)).DATABASE_URL)].filter(Boolean);
if(!primary.length)fail('No primary configuration available for comparison.');
if(primary.some(value=>{const p=identity(value);return p.host===target.host;}))fail('Test endpoint matches a primary endpoint (including pooled alias).');
console.log('PASS format, dedicated confirmation and distinct Neon endpoint; no connection details logged.');
if(!process.argv.includes('--adapter-only'))try{
  await dns.lookup(target.host);
  await new Promise((resolve,reject)=>{const socket=net.connect({host:target.host,port:Number(new URL(url).port)||5432});const done=(error)=>{socket.destroy();if(error)reject(error);else resolve();};socket.setTimeout(8000,()=>done(new Error('timeout')));socket.once('connect',()=>done());socket.once('error',done);});
  console.log('PASS DNS resolution and TCP connection to PostgreSQL endpoint.');
}catch(error){console.error(`FAIL network preflight (${error?.code==='ENOTFOUND'?'DNS':error?.code==='ETIMEDOUT'||error?.code==='timeout'?'timeout':`TCP ${error?.code??'error'}`}); SQL was not attempted.`);process.exit(1);}
const prisma=new PrismaClient({adapter:new PrismaNeon({connectionString:url})});
try{
  const result=await prisma.$queryRaw`SELECT 1`;
  if(result.length!==1||Number(Object.values(result[0])[0])!==1){console.error('FAIL SELECT 1 returned an unexpected result.');process.exitCode=1;}
  else console.log('PASS PrismaNeon connection and SELECT 1.');
}catch(error){
  const layers=[];let current=error;for(let depth=0;current&&depth<5;depth++){
    layers.push(current);
    current=current?.meta?.driverAdapterError??current?.cause??null;
  }
  const kinds=layers.map(x=>x&&typeof x==='object'?`${x.name??'Error'}:${x.kind??x.code??'-'}`:'Error').join(' > ');
  let message=layers.map(x=>x&&typeof x==='object'&&'message'in x?String(x.message):'').filter(Boolean).join(' | ');
  // Scrub all configured endpoints and credentials before reporting driver diagnostics.
  for(const value of [url,...primary])try{const u=new URL(value);for(const secret of [value,u.username,u.password,u.hostname,decodeURIComponent(u.pathname.slice(1))])if(secret)message=message.split(secret).join('[redacted]');}catch{}
  message=message.replace(/(?:postgres(?:ql)?|https?):\/\/[^\s"'`]+/gi,'[redacted URL]').replace(/[\r\n\t]+/g,' ').slice(0,300);
  console.error(`FAIL PrismaNeon SELECT 1 (cause ${kinds})${message?`: ${message}`:''}. No migration attempted.`);process.exitCode=1;
}
finally{await prisma.$disconnect().catch(()=>{});}
if(process.exitCode)process.exit(process.exitCode);
if(process.argv.includes('--migrate')){
  // Only this child receives the verified test URL. Parent/app files remain unchanged.
  const child=spawnSync(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],{env:{...process.env,DATABASE_URL:url},encoding:'utf8',timeout:180000});
  if(child.status!==0){console.error('FAIL test migration; raw CLI output suppressed to protect connection secrets.');process.exit(1);}
  console.log('PASS prisma migrate deploy on verified dedicated test endpoint.');
}
