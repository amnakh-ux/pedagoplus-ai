import { getCurrentTeacher } from '@/lib/current-teacher';
import { prisma } from '@/lib/prisma';
import { errorResponse, getOwnedSheet } from '@/lib/exercises/service';
import { readJson } from '@/lib/exercises/http';
import { ExerciseError } from '@/lib/exercises/validation';
import { parseDate } from '@/lib/planning';
export async function GET(){try{const teacher=await getCurrentTeacher();if(!teacher)return Response.json({error:'Non authentifié'},{status:401});return Response.json(await prisma.journalSession.findMany({where:{teacherId:teacher.id},orderBy:{date:'desc'},take:100,include:{schoolClass:{select:{name:true}},sheet:{select:{title:true}}}}),{headers:{'Cache-Control':'private, no-store'}});}catch(error){return errorResponse(error);}}
export async function POST(request:Request){
  try{const teacher=await getCurrentTeacher();if(!teacher)return Response.json({error:'Non authentifié'},{status:401});
    const body=await readJson(request),date=parseDate(body.date);
    if(!date||typeof body.sheetId!=='string'||typeof body.classId!=='string')throw new ExerciseError('Choisissez une classe, une fiche et une date valide.');
    const sheet=await getOwnedSheet(teacher.id,body.sheetId);if(!sheet.savedAt)throw new ExerciseError('Enregistrez la fiche avant de l’ajouter au journal.');
    const result=await prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT "id" FROM "Teacher" WHERE "id" = ${teacher.id} FOR UPDATE`;
      const schoolClass=await tx.schoolClass.findFirst({where:{id:body.classId,teacherId:teacher.id,level:'CM2'}});
      if(!schoolClass)throw new ExerciseError('Classe CM2 introuvable.',404);
      const year=Number(schoolClass.schoolYear.slice(0,4));if(date.getUTCFullYear()<year||date.getUTCFullYear()>year+1)throw new ExerciseError('La date doit appartenir à l’année scolaire de la classe.');
      return tx.journalSession.upsert({where:{teacherId_sheetId_classId_date:{teacherId:teacher.id,sheetId:sheet.id,classId:schoolClass.id,date}},update:{},create:{teacherId:teacher.id,sheetId:sheet.id,classId:schoolClass.id,date,title:sheet.title,duration:sheet.snapshot.parameters.duration}});
    });
    return Response.json(result,{status:201});
  }catch(error){return errorResponse(error);}
}
