import { getCurrentTeacher } from "@/lib/current-teacher";
import { prisma } from "@/lib/prisma";
import { validateRepartitionInput } from "@/lib/repartition-input";

export async function GET() {
  const teacher = await getCurrentTeacher();
  if (!teacher) return Response.json({ error: "Non authentifié" }, { status: 401 });
  const repartitions = await prisma.repartition.findMany({ where: { teacherId: teacher.id }, include: { rows: { orderBy: { week: "asc" } } }, orderBy: { createdAt: "desc" } });
  return Response.json(repartitions);
}

export async function POST(request: Request) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return Response.json({ error: "Non authentifié" }, { status: 401 });
  const input = validateRepartitionInput(await request.json().catch(() => null));
  if (!input) return Response.json({ error: "Répartition invalide" }, { status: 400 });
  const repartition = await prisma.repartition.create({ data: { ...input, teacherId: teacher.id, rows: { create: input.rows } }, include: { rows: { orderBy: { week: "asc" } } } });
  return Response.json(repartition, { status: 201 });
}
