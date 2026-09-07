import { getCurrentTeacher } from "@/lib/current-teacher";

export async function GET() {
  const teacher = await getCurrentTeacher();
  if (!teacher) return Response.json({ error: "Non authentifié" }, { status: 401 });
  return Response.json(teacher);
}
