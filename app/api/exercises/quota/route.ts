import { getCurrentTeacher } from '@/lib/current-teacher';
import { canGenerateExerciseSheet, errorResponse } from '@/lib/exercises/service';
export async function GET(){try{const teacher=await getCurrentTeacher();if(!teacher)return Response.json({error:'Non authentifié'},{status:401});return Response.json(await canGenerateExerciseSheet(teacher.id),{headers:{'Cache-Control':'private, no-store'}});}catch(error){return errorResponse(error);}}
