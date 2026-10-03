import { DIFFICULTIES, getSkill } from '@/lib/exercises/catalog';
import type { Exercise, Sheet } from '@/lib/exercises/types';
export function MathText({text}:{text:string}) {
  return <>{text.split(/(\d+\/\d+)/g).map((part,i)=>/^\d+\/\d+$/.test(part)?<span key={i} className="mx-1 inline-flex translate-y-1 flex-col text-center align-middle leading-tight"><span className="border-b border-black px-1">{part.split('/')[0]}</span><span className="px-1">{part.split('/')[1]}</span></span>:<span key={i}>{part}</span>)}</>;
}
function Operation({exercise}:{exercise:Exercise}) {
  const e=exercise, values=e.data.values, signs={add:'+',subtract:'−',multiply:'×',divide:'÷'};
  if(!(e.type in signs))return null;
  if(e.type==='divide')return <div className="my-4 flex w-fit font-mono text-lg"><span className="px-4">{values[0]}</span><div className="border-l border-black px-4"><span className="block border-b border-black pb-1">{values[1]}</span><span className="block min-h-8"/></div></div>;
  return <div className="my-4 w-fit min-w-28 border-b border-black px-2 pb-2 text-right font-mono text-lg">{values.map((n,i)=><div key={i} className="flex justify-between gap-4"><span>{i?signs[e.type as keyof typeof signs]:''}</span><span>{n}</span></div>)}</div>;
}
function Item({exercise,correction,spaces}:{exercise:Exercise;correction:boolean;spaces:boolean}) {
  return <div className="break-inside-avoid py-3"><p className="leading-loose"><MathText text={exercise.statement}/></p><Operation exercise={exercise}/>{correction?<div className="mt-3 space-y-2"><p className="font-semibold"><MathText text={exercise.answer.text}/></p><p className="leading-loose"><MathText text={exercise.explanation}/></p></div>:spaces?<div aria-label="Espace de réponse" className="mt-5 space-y-6"><div className="border-b border-dotted border-black"/><div className="border-b border-dotted border-black"/></div>:null}</div>;
}
export default function ExercisePreview({sheet,correction=false}:{sheet:Sheet;correction?:boolean}) {
  const p=sheet.parameters;
  return <article className="exercise-preview rounded-xl bg-white p-6 text-black shadow-sm sm:p-10" aria-label={correction?'Aperçu du corrigé':'Aperçu de la fiche élève'}>
    <h2 className="text-center text-xl font-semibold">{correction?'Corrigé — ':''}{sheet.title}</h2>
    <p className="mt-4 text-center">CM2 · Mathématiques · {getSkill(p.skill)!.domain}</p><p className="text-center">{DIFFICULTIES[p.difficulty]} · {p.duration} minutes</p>
    {!correction&&<p className="mt-6">Nom : ................ Prénom : ................ Date : ..........</p>}
    {sheet.example&&<section className="mt-6"><h3 className="font-semibold">Exemple</h3><Item exercise={sheet.example} correction spaces={false}/></section>}
    <ol className="mt-6 list-decimal space-y-4 pl-5">{sheet.exercises.map(e=><li key={e.id}><Item exercise={e} correction={correction} spaces={p.spaces&&!correction}/></li>)}</ol>
  </article>;
}
