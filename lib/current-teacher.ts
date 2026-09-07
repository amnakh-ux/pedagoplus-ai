import { auth, currentUser } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

export async function getCurrentTeacher() {
  const { userId } = await auth();
  if (!userId) return null;

  const existingTeacher = await prisma.teacher.findUnique({ where: { clerkId: userId } });
  if (existingTeacher) return existingTeacher;

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress;
  if (!user || !email) return null;

  return prisma.teacher.create({
    data: { clerkId: userId, email, firstName: user.firstName, lastName: user.lastName },
  });
}
