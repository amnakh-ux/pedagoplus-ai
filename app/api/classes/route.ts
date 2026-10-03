import { getCurrentTeacher } from "@/lib/current-teacher";
import { prisma } from "@/lib/prisma";
import { classInput } from "@/lib/profile-input";

export async function GET() {
  const teacher = await getCurrentTeacher();
  if (!teacher) return Response.json({error:"Non authentifié"},{status:401});
  return Response.json(await prisma.schoolClass.findMany({where:{teacherId:teacher.id},orderBy:{createdAt:"desc"},take:200}));
}
export async function POST(request:Request) {
  const teacher=await getCurrentTeacher();
  if (!teacher) return Response.json({error:"Non authentifié"},{status:401});
  const data=classInput(await request.json().catch(()=>null));
  if (!data) return Response.json({error:"Vérifiez le nom, le niveau CM1/CM2, le pays et l’année scolaire (AAAA-AAAA)."},{status:400});
  return Response.json(await prisma.schoolClass.create({data:{...data,teacherId:teacher.id}}),{status:201});
}
