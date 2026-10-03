import { prisma } from "@/lib/prisma";
export async function ownsPlanningClass(teacherId:string, input:{classId:string;level:string;schoolYear:string;country:string}) {
  return prisma.schoolClass.findFirst({where:{id:input.classId,teacherId,level:input.level,schoolYear:input.schoolYear,country:input.country},select:{id:true}});
}
