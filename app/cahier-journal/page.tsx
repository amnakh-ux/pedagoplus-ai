import Link from 'next/link';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { getCurrentTeacher } from '@/lib/current-teacher';
import { prisma } from '@/lib/prisma';
export default async function Page(){
  const teacher=await getCurrentTeacher();if(!teacher)redirect('/sign-in');
  const result=await Promise.allSettled([prisma.journalSession.findMany({where:{teacherId:teacher.id},orderBy:{date:'desc'},take:100,include:{schoolClass:{select:{name:true}},sheet:{select:{title:true}}}})]);
  const sessions=result[0].status==='fulfilled'?result[0].value:null;
  return <main className="flex min-h-screen flex-col bg-slate-100 text-slate-900 lg:flex-row"><Sidebar/><div className="min-w-0 flex-1 p-4 sm:p-8"><h1 className="text-3xl font-bold">Cahier journal</h1><p className="my-4">Séances de mathématiques liées à vos fiches d’exercices enregistrées.</p><Link href="/exercices" className="text-blue-700 underline">Créer une fiche et l’ajouter au journal</Link>
    {sessions===null?<p role="alert" className="mt-6">Module indisponible. Vérifiez la migration sur une base de développement/test.</p>:sessions.length?<ul className="mt-6 space-y-4">{sessions.map(s=><li key={s.id} className="rounded-xl bg-white p-5"><h2 className="font-semibold">{s.date.toLocaleDateString('fr-FR',{timeZone:'UTC'})} — {s.schoolClass.name}</h2><p>{s.title} · {s.duration} minutes</p><Link href={`/exercices?id=${s.sheetId}`} className="text-blue-700 underline">Ouvrir la fiche sauvegardée</Link></li>)}</ul>:<p className="mt-6 rounded-xl bg-white p-6">Aucune séance. Ajoutez une fiche depuis le générateur d’exercices.</p>}
  </div></main>;
}
