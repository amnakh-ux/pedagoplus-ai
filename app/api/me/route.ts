import { getCurrentTeacher } from "@/lib/current-teacher";
import { prisma } from "@/lib/prisma";
import { profileInput } from "@/lib/profile-input";
export async function GET() {
  const teacher=await getCurrentTeacher();
  if (!teacher) return Response.json({error:"Non authentifié"},{status:401});
  return Response.json(teacher);
}
export async function PUT(request:Request) {
  const teacher=await getCurrentTeacher();
  if (!teacher) return Response.json({error:"Non authentifié"},{status:401});
  const data=profileInput(await request.json().catch(()=>null));
  if (!data) return Response.json({error:"Renseignez prénom, nom, pays et année scolaire (AAAA-AAAA)."},{status:400});
  return Response.json(await prisma.teacher.update({where:{id:teacher.id},data}));
}
