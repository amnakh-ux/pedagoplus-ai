import Link from "next/link";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { getCurrentTeacher } from "@/lib/current-teacher";
import { prisma } from "@/lib/prisma";
export default async function Page({searchParams}:{searchParams:Promise<{page?:string}>}){
 const teacher=await getCurrentTeacher();if(!teacher)redirect("/sign-in");
 const params=await searchParams; const raw=Number(params.page??1), page=Number.isInteger(raw)&&raw>0?Math.min(raw,10000):1;
 const items=await prisma.repartition.findMany({where:{teacherId:teacher.id},orderBy:[{createdAt:"desc"},{id:"desc"}],skip:(page-1)*25,take:26,select:{id:true,level:true,schoolYear:true,validatedAt:true,schoolClass:{select:{name:true}}}});
 const [exerciseResult]=await Promise.allSettled([prisma.exerciseSheet.findMany({where:{teacherId:teacher.id},orderBy:[{updatedAt:"desc"},{id:"desc"}],skip:(page-1)*25,take:26,select:{id:true,title:true,savedAt:true,revision:true,snapshot:true}})]);
 const exercises=exerciseResult.status==='fulfilled'?exerciseResult.value:null;
 return <main className="flex min-h-screen flex-col bg-slate-100 text-slate-900 lg:flex-row"><Sidebar/><div className="min-w-0 flex-1 p-4 sm:p-8"><h1 className="text-3xl font-bold">Documents</h1><p className="my-4">Vos répartitions et fiches d’exercices. Les fiches générées à enregistrer peuvent être reprises ici.</p><Link href="/repartitions" className="text-blue-700 underline">Gérer l’historique des répartitions</Link>
 {!items.length?<p className="mt-6 rounded bg-white p-6">Aucun document sur cette page.</p>:<ul className="mt-6 space-y-3">{items.slice(0,25).map(r=><li key={r.id} className="rounded-xl bg-white p-5"><Link className="font-semibold text-blue-700 underline" href={"/repartition/lecons?id="+r.id}>Répartition {r.level} — {r.schoolYear}</Link><p>{r.schoolClass?.name??"Ancienne répartition sans classe"} — {r.validatedAt?"Validée":"Brouillon"}</p></li>)}</ul>}
 <h2 className="mt-8 text-xl font-semibold">Fiches d’exercices CM2</h2>
 {exercises===null?<p role="alert" className="mt-4">Module Exercices indisponible : vérifiez sa migration sur une base de développement/test.</p>:exercises.length?<ul className="mt-4 space-y-3">{exercises.slice(0,25).map(e=><li key={e.id} className="rounded-xl bg-white p-5"><Link href={`/exercices?id=${e.id}`} className="font-semibold text-blue-700 underline">{e.title}</Link><p>{e.savedAt?'Enregistrée':'À enregistrer'}</p>{e.savedAt&&<div className="mt-3 flex flex-wrap gap-4"><a href={`/api/exercises/${e.id}/pdf?revision=${e.revision}`} className="text-blue-700 underline">Télécharger le PDF élève</a>{!!(e.snapshot as {parameters?:{correction?:boolean}}).parameters?.correction&&<a href={`/api/exercises/${e.id}/pdf?kind=correction&revision=${e.revision}`} className="text-blue-700 underline">Télécharger le corrigé</a>}</div>}</li>)}</ul>:<p className="mt-4">Aucune fiche sur cette page. <Link href="/exercices" className="text-blue-700 underline">Générer une fiche</Link></p>}
 <nav aria-label="Pages des documents" className="mt-6 flex gap-6">{page>1&&<Link href={"/documents?page="+(page-1)}>← Précédente</Link>}{(items.length>25||(exercises?.length??0)>25)&&<Link href={"/documents?page="+(page+1)}>Suivante →</Link>}</nav></div></main>;
}
