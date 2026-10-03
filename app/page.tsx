import Link from "next/link";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import DashboardCard from "@/components/DashboardCard";
import { getCurrentTeacher } from "@/lib/current-teacher";
import { prisma } from "@/lib/prisma";
export default async function Home() {
 const teacher=await getCurrentTeacher();if(!teacher)redirect("/sign-in");
 const where={teacherId:teacher.id};
 const [documents,classes,recent]=await Promise.all([
 prisma.repartition.count({where}),prisma.schoolClass.count({where}),
 prisma.repartition.findMany({where,orderBy:{updatedAt:"desc"},take:5,select:{id:true,level:true,schoolYear:true,updatedAt:true,validatedAt:true}})]);
 const [exerciseCountResult,exerciseRecentResult]=await Promise.allSettled([prisma.exerciseSheet.count({where:{...where,savedAt:{not:null}}}),prisma.exerciseSheet.findMany({where:{...where,savedAt:{not:null}},orderBy:{updatedAt:"desc"},take:5,select:{id:true,title:true,updatedAt:true}})]);
 const exerciseCount=exerciseCountResult.status==='fulfilled'?exerciseCountResult.value:null;
 const exerciseRecent=exerciseRecentResult.status==='fulfilled'?exerciseRecentResult.value:[];
 const activities=[...recent.map(r=>({id:r.id,href:"/repartition/lecons?id="+r.id,title:`Répartition ${r.level} — ${r.schoolYear}`,updatedAt:r.updatedAt})),...exerciseRecent.map(e=>({id:e.id,href:"/exercices?id="+e.id,title:e.title,updatedAt:e.updatedAt}))].sort((a,b)=>b.updatedAt.getTime()-a.updatedAt.getTime()).slice(0,5);
 return <main className="flex min-h-screen flex-col bg-slate-100 text-slate-900 lg:flex-row"><Sidebar/><div className="min-w-0 flex-1"><Header/><div className="space-y-8 p-4 sm:p-8">
 <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4"><DashboardCard title="Classes" value={String(classes)}/><DashboardCard title="Répartitions" value={String(documents)}/><DashboardCard title="Fiches d’exercices enregistrées" value={exerciseCount===null?"Indisponible":String(exerciseCount)}/><DashboardCard title="Évaluations — À venir" value="0"/></div>
 {exerciseCount===null&&<p>Statistiques Exercices indisponibles : vérifiez la migration sur une base de développement/test.</p>}
 <section className="rounded-xl bg-white p-6"><h2 className="text-xl font-semibold">Activités récentes</h2>{activities.length?<ul className="mt-4 space-y-3">{activities.map(a=><li key={a.id}><Link className="text-blue-700 underline" href={a.href}>{a.title}</Link> — {a.updatedAt.toLocaleDateString("fr-FR",{timeZone:"UTC"})}</li>)}</ul>:<p className="mt-4">Aucun document enregistré.</p>}</section>
 <div className="flex flex-wrap gap-4"><Link href="/parametres" className="rounded-lg bg-blue-600 px-5 py-3 text-white">Gérer mon profil et mes classes</Link><Link href="/repartition" className="rounded-lg border bg-white px-5 py-3">Créer une répartition</Link><Link href="/exercices" className="rounded-lg border bg-white px-5 py-3">Générer des exercices CM2</Link></div>
 </div></div></main>;
}
