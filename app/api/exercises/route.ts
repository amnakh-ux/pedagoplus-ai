import { getCurrentTeacher } from '@/lib/current-teacher';
import { prisma } from '@/lib/prisma';
import { errorResponse, generateForTeacher } from '@/lib/exercises/service';
import { readJson } from '@/lib/exercises/http';
export async function GET() {
  try{const teacher=await getCurrentTeacher();if(!teacher)return Response.json({error:'Non authentifié'},{status:401});
    const items=await prisma.exerciseSheet.findMany({where:{teacherId:teacher.id},orderBy:{updatedAt:'desc'},take:50,select:{id:true,title:true,savedAt:true,updatedAt:true}});
    return Response.json(items,{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){return errorResponse(error);}
}
export async function POST(request:Request) {
  try{const teacher=await getCurrentTeacher();if(!teacher)return Response.json({error:'Non authentifié'},{status:401});
    const body=await readJson(request);return Response.json(await generateForTeacher(teacher.id,body.parameters,request.headers.get('Idempotency-Key')),{status:201,headers:{'Cache-Control':'private, no-store'}});
  }catch(error){return errorResponse(error);}
}
