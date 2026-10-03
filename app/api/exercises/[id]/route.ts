import { getCurrentTeacher } from '@/lib/current-teacher';
import { errorResponse, getOwnedSheet, updateSheet } from '@/lib/exercises/service';
import { readJson } from '@/lib/exercises/http';
type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,{params}:Context){try{const teacher=await getCurrentTeacher();if(!teacher)return Response.json({error:'Non authentifié'},{status:401});return Response.json(await getOwnedSheet(teacher.id,(await params).id),{headers:{'Cache-Control':'private, no-store'}});}catch(error){return errorResponse(error);}}
export async function PUT(request:Request,{params}:Context){try{const teacher=await getCurrentTeacher();if(!teacher)return Response.json({error:'Non authentifié'},{status:401});return Response.json(await updateSheet(teacher.id,(await params).id,await readJson(request)),{headers:{'Cache-Control':'private, no-store'}});}catch(error){return errorResponse(error);}}
