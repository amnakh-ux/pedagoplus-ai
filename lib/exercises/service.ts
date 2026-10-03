import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSkill } from './catalog';
import { editSheet, GENERATOR_VERSION, generateExercise, generateSheet, readSheet } from './generators';
import { createPdf } from './pdf';
import { calendarMonth, exerciseRights, idempotencyKey } from './policy';
import { ExerciseError, parameters } from './validation';
import type { Sheet } from './types';

const json=(sheet:Sheet)=>JSON.parse(JSON.stringify(sheet)) as Prisma.InputJsonValue;
type Transaction=Prisma.TransactionClient;
export async function getMonthlyGenerationCount(userId:string, now=new Date()) { return (await prisma.exerciseUsage.findUnique({where:{teacherId_monthKey:{teacherId:userId,monthKey:calendarMonth(now).key}}}))?.count??0; }
export async function canGenerateExerciseSheet(userId:string) {const now=new Date(),month=calendarMonth(now),count=await getMonthlyGenerationCount(userId,now),rights=exerciseRights(userId);return {...month,...rights,count,remaining:Math.max(0,rights.limit-count),canGenerate:count<rights.limit};}
async function locked<T>(userId:string, action:(tx:Transaction)=>Promise<T>) {
  return prisma.$transaction(async tx=>{
    // PostgreSQL row lock serializes quota, idempotency and sheet mutations per teacher.
    await tx.$queryRaw`SELECT "id" FROM "Teacher" WHERE "id" = ${userId} FOR UPDATE`;
    return action(tx);
  },{maxWait:10000,timeout:15000});
}
async function rate(tx:Transaction,userId:string) {
  const bucket=new Date().toISOString().slice(0,16);
  const window=await tx.exerciseRequestWindow.upsert({where:{teacherId_bucket:{teacherId:userId,bucket}},create:{teacherId:userId,bucket,count:1},update:{count:{increment:1}}});
  if(window.count>30)throw new ExerciseError('Trop de demandes : réessayez dans une minute.',429);
  await tx.exerciseRequestWindow.deleteMany({where:{teacherId:userId,bucket:{lt:new Date(Date.now()-86400000).toISOString().slice(0,16)}}});
}
export async function generateForTeacher(userId:string,input:unknown,keyInput:unknown) {
  const p=parameters(input),key=idempotencyKey(keyInput),fingerprint=JSON.stringify(p);
  return locked(userId,async tx=>{
    const previous=await tx.exerciseSheet.findUnique({where:{teacherId_generationKey:{teacherId:userId,generationKey:key}}});
    if(previous){if(previous.requestFingerprint!==fingerprint)throw new ExerciseError('Cette clé correspond à d’autres paramètres.',409);return previous;}
    await rate(tx,userId);
    const month=calendarMonth(),rights=exerciseRights(userId);
    const usage=await tx.exerciseUsage.upsert({where:{teacherId_monthKey:{teacherId:userId,monthKey:month.key}},create:{teacherId:userId,monthKey:month.key,count:0},update:{}});
    if(usage.count>=rights.limit)throw new ExerciseError(`Quota atteint : ${rights.limit} fiches par mois. Renouvellement le ${month.renewalDate} (${month.timezone}).`,429);
    const sheet=generateSheet(p);
    // Fail before counting if the requested student PDF cannot fit at 12 points.
    createPdf(sheet);if(p.correction)createPdf(sheet,true);
    const record=await tx.exerciseSheet.create({data:{teacherId:userId,title:sheet.title,level:p.level,subject:p.subject,domain:getSkill(p.skill)!.domain,skill:p.skill,difficulty:p.difficulty,snapshot:json(sheet),generationKey:key,requestFingerprint:fingerprint,monthKey:month.key}});
    await tx.exerciseUsage.update({where:{teacherId_monthKey:{teacherId:userId,monthKey:month.key}},data:{count:{increment:1}}});
    return record;
  });
}
export async function getOwnedSheet(userId:string,id:string) {const record=await prisma.exerciseSheet.findFirst({where:{id,teacherId:userId}});if(!record)throw new ExerciseError('Fiche introuvable.',404);return {...record,snapshot:readSheet(record.snapshot)};}
export async function updateSheet(userId:string,id:string,input:unknown,regenerateIndex?:number) {
  if(!input||typeof input!=='object')throw new ExerciseError('Modification invalide.');
  const body=input as {revision:number;edits:unknown};
  if(!Number.isInteger(body.revision)||body.revision<1)throw new ExerciseError('Version de fiche invalide.');
  return locked(userId,async tx=>{
    const stored=await tx.exerciseSheet.findFirst({where:{id,teacherId:userId}});if(!stored)throw new ExerciseError('Fiche introuvable.',404);
    if(stored.revision!==body.revision)throw new ExerciseError('Cette fiche a changé dans une autre fenêtre. Rechargez-la avant de poursuivre.',409);
    await rate(tx,userId);
    let sheet=editSheet(readSheet(stored.snapshot),body.edits);
    if(regenerateIndex!==undefined){if(!Number.isInteger(regenerateIndex)||regenerateIndex<0||regenerateIndex>=sheet.exercises.length)throw new ExerciseError('Exercice introuvable.');const old=sheet.exercises[regenerateIndex];sheet={...sheet,generatorVersion:GENERATOR_VERSION,exercises:sheet.exercises.map((e,i)=>i===regenerateIndex?generateExercise(sheet.parameters,old.id,sheet.exercises):e)};}
    createPdf(sheet);if(sheet.parameters.correction)createPdf(sheet,true);
    return tx.exerciseSheet.update({where:{id_teacherId:{id,teacherId:userId}},data:{snapshot:json(sheet),savedAt:new Date(),revision:{increment:1}}});
  });
}
export function errorResponse(error:unknown) {
  if(error instanceof ExerciseError)return Response.json({error:error.message},{status:error.status});
  const code=error&&typeof error==='object'&&'code'in error?error.code:null;
  if(code==='P2021'||code==='P2022')return Response.json({error:'Le module Exercices nécessite sa migration sur une base de développement/test. Aucune migration automatique n’est exécutée.'},{status:503});
  // Never return database details, connection strings or raw exception messages.
  return Response.json({error:'Le service est temporairement indisponible. Réessayez sans changer la clé de demande.'},{status:503});
}
