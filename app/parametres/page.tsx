import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import Sidebar from "@/components/Sidebar";
import SettingsForm from "@/components/SettingsForm";
import { getCurrentTeacher } from "@/lib/current-teacher";
import { prisma } from "@/lib/prisma";
export default async function Page(){
 const teacher=await getCurrentTeacher();if(!teacher)redirect("/sign-in");
 const classes=await prisma.schoolClass.findMany({where:{teacherId:teacher.id},select:{id:true,name:true,level:true,country:true,schoolYear:true},orderBy:{createdAt:"desc"},take:200});
 return <main className="flex min-h-screen flex-col bg-slate-100 text-slate-900 lg:flex-row"><Sidebar/><div className="w-full max-w-5xl p-4 sm:p-8"><div className="mb-6 flex items-center justify-between"><h1 className="text-3xl font-bold">Paramètres</h1><UserButton/></div><SettingsForm profile={{firstName:teacher.firstName,lastName:teacher.lastName,country:teacher.country,schoolYear:teacher.schoolYear}} initialClasses={classes}/></div></main>;
}
