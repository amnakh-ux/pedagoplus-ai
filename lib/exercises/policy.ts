import { ExerciseError } from './validation';
export const QUOTA_TIMEZONE = 'UTC';
export const FREE_MONTHLY_LIMIT = 3;
// Server-only configuration; no request can select a plan or bypass a quota.
export function exerciseRights(userId:string) {
  const premiumUsers=(process.env.EXERCISE_PREMIUM_TEACHER_IDS??'').split(',').map(s=>s.trim());
  const configured=Number(process.env.EXERCISE_PREMIUM_MONTHLY_LIMIT??30);
  const premium=premiumUsers.includes(userId);
  return {plan:premium?'premium':'gratuit',limit:premium&&Number.isInteger(configured)&&configured>0?configured:FREE_MONTHLY_LIMIT,pdf:true,correction:true,save:true};
}
export function calendarMonth(now=new Date()) {
  const year=now.getUTCFullYear(),month=now.getUTCMonth()+1;
  return {key:`${year}-${String(month).padStart(2,'0')}`,renewalDate:`${month===12?year+1:year}-${String(month===12?1:month+1).padStart(2,'0')}-01`,timezone:QUOTA_TIMEZONE};
}
export function idempotencyKey(value:unknown) {if(typeof value!=='string'||! /^[a-zA-Z0-9_-]{16,100}$/.test(value))throw new ExerciseError('Clé de demande invalide.');return value;}
