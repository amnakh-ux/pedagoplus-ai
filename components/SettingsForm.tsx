"use client";
import { useState, type FormEvent } from "react";
type Profile={firstName:string|null;lastName:string|null;country:string;schoolYear:string};
type ClassItem={id:string;name:string;level:string;country:string;schoolYear:string};
const inputStyle="mt-1 w-full rounded-lg border border-slate-300 p-3";
export default function SettingsForm({profile,initialClasses}:{profile:Profile;initialClasses:ClassItem[]}) {
  const [classes,setClasses]=useState(initialClasses);
  const [editing,setEditing]=useState<ClassItem|null>(null);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  async function save(event:FormEvent<HTMLFormElement>,kind:"profile"|"class") {
    event.preventDefault(); if(busy)return;
    const form=event.currentTarget, data=Object.fromEntries(new FormData(form));
    setBusy(true);setMessage("");
    try{
      const url=kind==="profile"?"/api/me":editing?"/api/classes/"+editing.id:"/api/classes";
      const response=await fetch(url,{method:kind==="profile"||editing?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error??"Enregistrement impossible.");
      if(kind==="class"){setClasses(old=>editing?old.map(c=>c.id===editing.id?result:c):[result,...old]);setEditing(null);form.reset();}
      setMessage("Enregistrement effectué.");
    }catch(error){setMessage(error instanceof Error?error.message:"Enregistrement impossible.");}
    finally{setBusy(false);}
  }
  return <div className="space-y-8">
    <p role="status" aria-live="polite">{message}</p>
    <form onSubmit={e=>void save(e,"profile")} className="rounded-xl bg-white p-6">
      <h2 className="text-xl font-semibold">Mon profil enseignant</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <label>Prénom<input name="firstName" required maxLength={100} defaultValue={profile.firstName??""} className={inputStyle}/></label>
      <label>Nom<input name="lastName" required maxLength={100} defaultValue={profile.lastName??""} className={inputStyle}/></label>
      <label>Pays<input name="country" required maxLength={80} defaultValue={profile.country} className={inputStyle}/></label>
      <label>Année scolaire<input name="schoolYear" required pattern="20[0-9]{2}-20[0-9]{2}" defaultValue={profile.schoolYear} className={inputStyle}/></label>
      </div><button disabled={busy} className="mt-4 rounded-lg bg-blue-600 px-5 py-3 text-white disabled:opacity-50">Enregistrer le profil</button>
    </form>
    <section className="rounded-xl bg-white p-6"><h2 className="text-xl font-semibold">Mes classes</h2>
      {!classes.length?<p className="mt-4">Aucune classe. Créez votre première classe ci-dessous.</p>:<ul className="mt-4 space-y-3">{classes.map(c=><li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded border p-3"><span>{c.name} — {c.level} — {c.country} — {c.schoolYear}</span><button disabled={busy} onClick={()=>{setEditing(c);setMessage("");}} className="rounded border px-3 py-2">Modifier {c.name}</button></li>)}</ul>}
    </section>
    <form key={editing?.id??"new"} onSubmit={e=>void save(e,"class")} className="rounded-xl bg-white p-6">
      <h2 className="text-xl font-semibold">{editing?"Modifier la classe":"Créer une classe"}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <label>Nom de la classe<input name="name" required maxLength={100} defaultValue={editing?.name??""} className={inputStyle}/></label>
      <label>Niveau<select name="level" defaultValue={editing?.level??"CM2"} className={inputStyle}><option>CM1</option><option>CM2</option></select></label>
      <label>Pays<input name="country" required maxLength={80} defaultValue={editing?.country??profile.country} className={inputStyle}/></label>
      <label>Année scolaire<input name="schoolYear" required pattern="20[0-9]{2}-20[0-9]{2}" defaultValue={editing?.schoolYear??profile.schoolYear} className={inputStyle}/></label>
      </div><button disabled={busy} className="mt-4 rounded-lg bg-blue-600 px-5 py-3 text-white disabled:opacity-50">{busy?"Enregistrement…":"Enregistrer la classe"}</button>
      {editing&&<button type="button" disabled={busy} onClick={()=>setEditing(null)} className="ml-3 rounded border px-4 py-3">Annuler</button>}
    </form>
  </div>;
}
