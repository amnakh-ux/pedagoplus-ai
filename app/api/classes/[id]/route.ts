import { getCurrentTeacher } from "@/lib/current-teacher";
import { prisma } from "@/lib/prisma";
import { classInput } from "@/lib/profile-input";
type Context={params:Promise<{id:string}>};
export async function PUT(request:Request,{params}:Context) {
  const teacher=await getCurrentTeacher();
  if (!teacher) return Response.json({error:"Non authentifié"},{status:401});
  const data=classInput(await request.json().catch(()=>null));
  if (!data) return Response.json({error:"Classe invalide : renseignez nom, niveau CM1/CM2, pays et année scolaire."},{status:400});
  const {id}=await params;
  const result=await prisma.schoolClass.updateMany({where:{id,teacherId:teacher.id},data});
  if (!result.count) return Response.json({error:"Classe introuvable"},{status:404});
  return Response.json({id,...data});
}
