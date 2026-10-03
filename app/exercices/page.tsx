import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import ExerciseEditor from '@/components/ExerciseEditor';
import { getCurrentTeacher } from '@/lib/current-teacher';
import { prisma } from '@/lib/prisma';
import { canGenerateExerciseSheet, getOwnedSheet } from '@/lib/exercises/service';
import { ExerciseError } from '@/lib/exercises/validation';
export default async function Page({searchParams}:{searchParams:Promise<{id?:string}>}) {
  const teacher=await getCurrentTeacher();if(!teacher)redirect('/sign-in');const {id}=await searchParams;
  const [record,quota,classes]=await Promise.allSettled([id?getOwnedSheet(teacher.id,id):Promise.resolve(null),canGenerateExerciseSheet(teacher.id),prisma.schoolClass.findMany({where:{teacherId:teacher.id},select:{id:true,name:true,level:true},orderBy:{name:'asc'}})]);
  const initial=record.status==='fulfilled'&&record.value?{...record.value,createdAt:record.value.createdAt.toISOString(),updatedAt:record.value.updatedAt.toISOString(),savedAt:record.value.savedAt?.toISOString()??null}:null;
  const error=record.status==='rejected'&&record.reason instanceof ExerciseError?record.reason.message:record.status==='rejected'||quota.status==='rejected'?'Module indisponible : vérifiez la migration Exercices sur une base de développement/test. Aucune migration automatique.':'';
  return <main className="flex min-h-screen flex-col bg-slate-100 text-slate-900 lg:flex-row"><Sidebar/><ExerciseEditor key={id??'new'} initial={initial} initialError={error} quota={quota.status==='fulfilled'?quota.value:null} classes={classes.status==='fulfilled'?classes.value:[]}/></main>;
}
