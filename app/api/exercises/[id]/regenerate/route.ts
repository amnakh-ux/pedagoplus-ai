import { getCurrentTeacher } from '@/lib/current-teacher';
import { errorResponse, updateSheet } from '@/lib/exercises/service';
import { readJson } from '@/lib/exercises/http';
import { ExerciseError } from '@/lib/exercises/validation';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const teacher=await getCurrentTeacher();if(!teacher)return Response.json({error:'Non authentifié'},{status:401});const body=await readJson(request);if(!Number.isInteger(body.index))throw new ExerciseError('Choisissez un exercice à régénérer.');return Response.json(await updateSheet(teacher.id,(await params).id,body,body.index),{headers:{'Cache-Control':'private, no-store'}});}catch(error){return errorResponse(error);}}
