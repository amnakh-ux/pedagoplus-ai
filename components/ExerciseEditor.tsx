'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { SKILLS, DIFFICULTIES, getSkill } from '@/lib/exercises/catalog';
import { editSheet } from '@/lib/exercises/generators';
import { pdfLayout } from '@/lib/exercises/layout';
import type { Difficulty, Parameters, Sheet, SheetRecord } from '@/lib/exercises/types';
import ExercisePreview from './ExercisePreview';

type Quota={remaining:number;limit:number;count:number;renewalDate:string;timezone:string};
type Props={initial:SheetRecord|null;initialError:string;classes:{id:string;name:string;level:string}[];quota:Quota|null};
const defaults:Parameters={level:'CM2',subject:'Mathématiques',skill:'grands-nombres',difficulty:'standard',count:3,duration:20,example:false,correction:true,spaces:true,pages:2};
const editsFrom=(sheet:Sheet)=>sheet.exercises.map(e=>e.data.values.map(String));
export default function ExerciseEditor({initial,initialError,classes,quota:initialQuota}:Props) {
  const [record,setRecord]=useState(initial),[p,setP]=useState<Parameters>(initial?.snapshot.parameters??defaults),[edits,setEdits]=useState<string[][]>(initial?editsFrom(initial.snapshot):[]);
  const [quota,setQuota]=useState(initialQuota),[message,setMessage]=useState(initialError),[busy,setBusy]=useState(false),[showCorrection,setShowCorrection]=useState(false),[classId,setClassId]=useState(''),[date,setDate]=useState('');
  const lock=useRef(false),requestKey=useRef<{fingerprint:string;key:string}|null>(null);
  const changed=!!record&&JSON.stringify(edits)!==JSON.stringify(editsFrom(record.snapshot));
  const parametersChanged=!!record&&JSON.stringify(p)!==JSON.stringify(record.snapshot.parameters);
  let preview:Sheet|null=record?.snapshot??null,invalid='';
  if(record){try{preview=changed?editSheet(record.snapshot,edits.map((values,i)=>({values:values.map(v=>v.trim()===''?NaN:Number(v)),scale:record.snapshot.exercises[i].data.scale}))):record.snapshot;pdfLayout(preview);}catch(error){preview=null;invalid=error instanceof Error?error.message:'Données invalides.';}}
  const dirty=changed||parametersChanged;
  useEffect(()=>{
    if(!dirty)return;
    const unload=(event:BeforeUnloadEvent)=>{event.preventDefault();};
    const navigation=(event:MouseEvent)=>{const anchor=(event.target as Element).closest('a');if(anchor&&anchor.getAttribute('href')&&!anchor.hasAttribute('download')&&!window.confirm('Des modifications ne sont pas enregistrées. Quitter cette fiche ?')){event.preventDefault();event.stopPropagation();}};
    window.addEventListener('beforeunload',unload);document.addEventListener('click',navigation,true);
    return()=>{window.removeEventListener('beforeunload',unload);document.removeEventListener('click',navigation,true);};
  },[dirty]);
  async function jsonRequest(url:string,options?:RequestInit){const response=await fetch(url,options);const body=await response.json();if(!response.ok)throw new Error(body.error??'La demande a échoué.');return body;}
  const body=(value:unknown)=>({headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});
  function accept(value:SheetRecord){setRecord(value);setEdits(editsFrom(value.snapshot));setP(value.snapshot.parameters);window.history.replaceState(null,'',`/exercices?id=${value.id}`);}
  async function action(work:()=>Promise<void>){if(lock.current)return;lock.current=true;setBusy(true);setMessage('');try{await work();}catch(error){setMessage(error instanceof Error?error.message:'Une erreur est survenue.');}finally{lock.current=false;setBusy(false);}}
  function generate(){
    if(record&&!window.confirm('Générer une nouvelle fiche consomme une génération mensuelle. Les modifications non enregistrées seront abandonnées. Continuer ?'))return;
    void action(async()=>{const fingerprint=JSON.stringify(p);
      if(!requestKey.current){try{const pending=JSON.parse(sessionStorage.getItem('exercise-generation-request-v1')??'null');if(pending?.fingerprint===fingerprint&&typeof pending.key==='string'&&/^[a-zA-Z0-9_-]{16,100}$/.test(pending.key))requestKey.current=pending;}catch{/* Storage may be disabled; retries still use the ref. */}}
      if(requestKey.current?.fingerprint!==fingerprint)requestKey.current={fingerprint,key:crypto.randomUUID()};
      try{sessionStorage.setItem('exercise-generation-request-v1',JSON.stringify(requestKey.current));}catch{/* Quota enforcement is exclusively server-side. */}
      const value=await jsonRequest('/api/exercises',{method:'POST',...body({parameters:p}),headers:{'Content-Type':'application/json','Idempotency-Key':requestKey.current.key}});
      accept(value);requestKey.current=null;try{sessionStorage.removeItem('exercise-generation-request-v1');}catch{/* Optional local retry cache. */}setShowCorrection(false);setMessage('Fiche générée. Vérifiez les exercices, puis enregistrez pour les exports et le journal.');
      try{setQuota(await jsonRequest('/api/exercises/quota'));}catch{setQuota(null);}
    });
  }
  function save(index?:number){if(!record||!preview)return;void action(async()=>{const payload={revision:record.revision,edits:preview.exercises.map(e=>e.data),...(index===undefined?{}:{index})};
    const value=await jsonRequest(`/api/exercises/${record.id}${index===undefined?'':'/regenerate'}`,{method:index===undefined?'PUT':'POST',...body(payload)});accept(value);setMessage(index===undefined?'Fiche enregistrée.':'Exercice régénéré et fiche enregistrée ; les autres exercices sont conservés.');
  });}
  function download(correction:boolean){if(!record)return;void action(async()=>{const response=await fetch(`/api/exercises/${record.id}/pdf?kind=${correction?'correction':'student'}&revision=${record.revision}`);if(!response.ok){const result=await response.json();throw new Error(result.error??'Téléchargement impossible.');}const blob=await response.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`fiche-${record.id}-${correction?'corrige':'eleve'}.pdf`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('PDF téléchargé depuis la version enregistrée.');});}
  const field='mt-1 w-full rounded-lg border border-slate-300 bg-white p-2';
  const button='rounded-lg border border-slate-300 bg-white px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50';
  const skill=getSkill(p.skill)!;
  const canExport=!!record?.savedAt&&!dirty&&!invalid;
  return <div className="min-w-0 flex-1 space-y-6 p-4 sm:p-8">
    <h1 className="text-3xl font-bold">Générateur d’exercices CM2</h1><p>Mathématiques. CM1 et les autres matières sont à venir.</p>
    {quota&&<p className="rounded-xl bg-blue-50 p-4">{quota.remaining} génération(s) restante(s) sur {quota.limit}. Renouvellement le {quota.renewalDate} ({quota.timezone}). Une fiche complète compte ; un exercice régénéré, une sauvegarde et un PDF ne comptent pas.</p>}
    <p role="status" aria-live="polite" className="min-h-6 text-blue-800">{busy?'Traitement en cours…':message}</p>
    <fieldset disabled={busy} className="space-y-6 disabled:opacity-70"><legend className="sr-only">Paramètres et édition</legend>
      <section className="rounded-xl bg-white p-5"><h2 className="text-xl font-semibold">Paramètres</h2><div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <label>Niveau<input className={field} value="CM2" readOnly/></label><label>Matière<input className={field} value="Mathématiques" readOnly/></label>
        <label>Domaine<select className={field} value={skill.domain} onChange={e=>setP({...p,skill:SKILLS.find(s=>s.domain===e.target.value)!.slug})}>{[...new Set(SKILLS.map(s=>s.domain))].map(d=><option key={d}>{d}</option>)}</select></label>
        <label>Compétence<select className={field} value={p.skill} onChange={e=>setP({...p,skill:e.target.value})}>{SKILLS.filter(s=>s.domain===skill.domain).map(s=><option key={s.slug} value={s.slug}>{s.title}</option>)}</select></label>
        <label>Difficulté<select className={field} value={p.difficulty} onChange={e=>setP({...p,difficulty:e.target.value as Difficulty})}>{Object.entries(DIFFICULTIES).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>
        <label>Nombre d’exercices<select className={field} value={p.count} onChange={e=>setP({...p,count:Number(e.target.value)})}>{[3,4,5,6].map(n=><option key={n}>{n}</option>)}</select></label>
        <label>Durée estimée (minutes)<input type="number" min={5} max={120} className={field} value={p.duration} onChange={e=>setP({...p,duration:Number(e.target.value)})}/></label>
        <label>Pages élève<select className={field} value={p.pages} onChange={e=>setP({...p,pages:Number(e.target.value) as 1|2})}><option value={1}>Une page A4</option><option value={2}>Deux pages A4</option></select></label>
        <div className="space-y-3">{([['example','Exemple'],['correction','Corrigé séparé'],['spaces','Espaces de réponse']] as const).map(([key,label])=><label key={key} className="flex items-center gap-2"><input type="checkbox" checked={p[key]} onChange={e=>setP({...p,[key]:e.target.checked})}/>{label}</label>)}</div>
      </div><p className="mt-4 text-sm text-slate-600">{skill.description}</p><p className="mt-2 text-sm text-slate-600">Bornes : {skill.rules[p.difficulty].min} à {skill.rules[p.difficulty].max} ; décimales : {skill.rules[p.difficulty].decimals} ; dénominateurs : {skill.rules[p.difficulty].denominators.join(', ')}. {skill.rules[p.difficulty].carries?'Retenues autorisées.':'Soutien : pas de retenue dans les additions, pas d’emprunt dans les soustractions.'}</p>
      <button type="button" onClick={generate} className="mt-5 rounded-lg bg-blue-600 px-5 py-3 text-white disabled:opacity-50" disabled={quota?.remaining===0}>{record?'Régénérer la fiche complète':'Générer la fiche'}</button>
      {parametersChanged&&<p className="mt-3">Les nouveaux paramètres s’appliqueront à une nouvelle génération. L’aperçu ci-dessous conserve les paramètres de la fiche actuelle.</p>}</section>
      {record&&<>
        <section className="rounded-xl bg-white p-5"><h2 className="text-xl font-semibold">Modifier les données des exercices</h2><p className="mt-2">Les corrections sont recalculées. Les décimaux sont saisis en entiers mis à l’échelle (ex. 125 pour 1,25 à deux décimales). Une régénération ponctuelle enregistre aussi les autres modifications valides.</p>
          {edits.map((values,i)=><div key={record.snapshot.exercises[i].id} className="mt-4 rounded-lg border p-3"><h3 className="font-semibold">Exercice {i+1}</h3><div className="mt-2 flex flex-wrap items-end gap-3">{values.map((v,j)=><label key={j}>Donnée {j+1}<input aria-label={`Exercice ${i+1}, donnée ${j+1}`} type="number" step={1} min={0} className={field+' max-w-40'} value={v} onChange={e=>setEdits(old=>old.map((row,n)=>n===i?row.map((x,k)=>k===j?e.target.value:x):row))}/></label>)}<button type="button" className={button} disabled={!!invalid||parametersChanged} onClick={()=>save(i)}>Régénérer cet exercice</button></div></div>)}
          {invalid&&<p role="alert" className="mt-4 text-red-700">{invalid}</p>}
          <div className="mt-5 flex flex-wrap gap-3"><button type="button" className={button} disabled={!!invalid||parametersChanged} onClick={()=>save()}>Enregistrer la fiche</button><button type="button" className={button} disabled={!canExport} onClick={()=>download(false)}>Télécharger le PDF élève</button>
          {record.snapshot.parameters.correction&&<><button type="button" className={button} disabled={!!invalid} onClick={()=>setShowCorrection(!showCorrection)}>{showCorrection?'Masquer':'Afficher'} le corrigé</button><button type="button" className={button} disabled={!canExport} onClick={()=>download(true)}>Télécharger le PDF corrigé</button></>}</div>
          <p className="mt-3 text-sm">{dirty?'Modifications non enregistrées.':record.savedAt?'Version enregistrée.':'Fiche générée à enregistrer.'} Les téléchargements et le journal utilisent la version enregistrée.</p>
        </section>
        <section className="rounded-xl bg-white p-5"><h2 className="text-xl font-semibold">Ajouter au Cahier journal</h2>{classes.some(c=>c.level==='CM2')?<div className="mt-4 flex flex-wrap items-end gap-3"><label>Classe CM2<select className={field} value={classId} onChange={e=>setClassId(e.target.value)}><option value="">Choisir une classe</option>{classes.filter(c=>c.level==='CM2').map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Date de séance<input type="date" className={field} value={date} onChange={e=>setDate(e.target.value)}/></label><button type="button" className={button} disabled={!canExport||!classId||!date} onClick={()=>void action(async()=>{await jsonRequest('/api/journal',{method:'POST',...body({sheetId:record.id,classId,date})});setMessage('Séance ajoutée au Cahier journal.');})}>Ajouter la séance</button></div>:<p className="mt-3">Créez une classe CM2 dans <Link href="/parametres" className="underline">Paramètres</Link>.</p>}<Link href="/cahier-journal" className="mt-4 inline-block text-blue-700 underline">Ouvrir le Cahier journal</Link></section>
      </>}
    </fieldset>
    {preview&&<ExercisePreview sheet={preview}/>}{preview&&showCorrection&&preview.parameters.correction&&<ExercisePreview sheet={preview} correction/>}
  </div>;
}
