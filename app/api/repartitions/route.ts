import { getCurrentTeacher } from "@/lib/current-teacher";
import { prisma } from "@/lib/prisma";
import { validateRepartitionInput } from "@/lib/repartition-input";
import { ownsPlanningClass } from "@/lib/repartition-class";

export async function GET(request: Request) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return Response.json({ error: "Non authentifié" }, { status: 401 });
  const page = Number(new URL(request.url).searchParams.get("page") ?? 1);
  if (!Number.isInteger(page) || page < 1 || page > 10000) return Response.json({ error: "Page invalide" }, { status: 400 });
  const repartitions = await prisma.repartition.findMany({ where: { teacherId: teacher.id }, select: { id:true,schoolYear:true,level:true,type:true,createdAt:true,validatedAt:true }, orderBy: [{ createdAt: "desc" },{id:"desc"}], skip:(page-1)*50,take:50 });
  return Response.json(repartitions);
}

export async function POST(request: Request) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return Response.json({ error: "Non authentifié" }, { status: 401 });
  const input = validateRepartitionInput(await request.json().catch(() => null));
  if (!input) return Response.json({ error: "Répartition invalide" }, { status: 400 });
  if (!await ownsPlanningClass(teacher.id,input)) return Response.json({error:"Classe introuvable ou paramètres scolaires différents de la classe."},{status:400});
  const repartition = await prisma.repartition.create({ data: { ...input, teacherId: teacher.id, rows: { create: input.rows } }, include: { rows: { orderBy: { week: "asc" } } } });
  return Response.json(repartition, { status: 201 });
}
