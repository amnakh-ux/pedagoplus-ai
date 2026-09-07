import { getCurrentTeacher } from "@/lib/current-teacher";
import { prisma } from "@/lib/prisma";
import { validateRepartitionInput } from "@/lib/repartition-input";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return Response.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;
  const repartition = await prisma.repartition.findFirst({ where: { id, teacherId: teacher.id }, include: { rows: { orderBy: { week: "asc" } } } });
  if (!repartition) return Response.json({ error: "Répartition introuvable" }, { status: 404 });
  return Response.json(repartition);
}

export async function PUT(request: Request, { params }: Context) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return Response.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;
  const input = validateRepartitionInput(await request.json().catch(() => null));
  if (!input) return Response.json({ error: "Répartition invalide" }, { status: 400 });
  const existing = await prisma.repartition.findFirst({ where: { id, teacherId: teacher.id }, select: { id: true } });
  if (!existing) return Response.json({ error: "Répartition introuvable" }, { status: 404 });
  const repartition = await prisma.repartition.update({ where: { id }, data: { ...input, rows: { deleteMany: {}, create: input.rows } }, include: { rows: { orderBy: { week: "asc" } } } });
  return Response.json(repartition);
}

export async function DELETE(_request: Request, { params }: Context) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return Response.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;
  const result = await prisma.repartition.deleteMany({ where: { id, teacherId: teacher.id } });
  if (result.count === 0) return Response.json({ error: "Répartition introuvable" }, { status: 404 });
  return new Response(null, { status: 204 });
}
