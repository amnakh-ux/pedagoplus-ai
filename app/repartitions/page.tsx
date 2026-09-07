"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

type Repartition = { id: string; schoolYear: string; level: string; type: string; createdAt: string };

export default function RepartitionsPage() {
  const [items, setItems] = useState<Repartition[]>([]);
  const [message, setMessage] = useState("Chargement…");

  useEffect(() => {
    void fetch("/api/repartitions").then(async (response) => {
      if (!response.ok) throw new Error();
      const data = (await response.json()) as Repartition[];
      setItems(data);
      setMessage(data.length === 0 ? "Aucune répartition enregistrée." : "");
    }).catch(() => setMessage("Impossible de charger les répartitions."));
  }, []);

  async function remove(id: string) {
    if (!window.confirm("Supprimer définitivement cette répartition ?")) return;
    const response = await fetch(`/api/repartitions/${id}`, { method: "DELETE" });
    if (!response.ok) return setMessage("La suppression a échoué.");
    setItems((current) => current.filter((item) => item.id !== id));
  }

  return <main className="flex min-h-screen flex-col bg-slate-100 text-slate-900 lg:flex-row">
    <Sidebar />
    <div className="flex-1 p-4 sm:p-8"><div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-bold">Historique des répartitions</h1><p className="mt-2 text-slate-600">Retrouvez et gérez vos répartitions enregistrées.</p></div><Link href="/repartition" className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white">Nouvelle répartition</Link></div>
      {message && <p className="mt-8 rounded-xl bg-white p-5 text-slate-600">{message}</p>}
      {items.length > 0 && <div className="mt-8 overflow-x-auto rounded-2xl bg-white shadow-sm"><table className="w-full border-collapse text-left">
        <thead><tr className="bg-slate-50"><th className="p-4">Année scolaire</th><th className="p-4">Niveau</th><th className="p-4">Type</th><th className="p-4">Créée le</th><th className="p-4">Actions</th></tr></thead>
        <tbody>{items.map((item) => <tr key={item.id} className="border-t"><td className="p-4">{item.schoolYear}</td><td className="p-4">{item.level}</td><td className="p-4 capitalize">{item.type}</td><td className="p-4">{new Date(item.createdAt).toLocaleDateString("fr-FR")}</td><td className="p-4"><div className="flex flex-wrap gap-2"><Link href={`/repartition/lecons?id=${item.id}&mode=view`} className="rounded-lg border px-3 py-2">Ouvrir</Link><Link href={`/repartition/lecons?id=${item.id}&mode=edit`} className="rounded-lg bg-blue-600 px-3 py-2 text-white">Modifier</Link><button type="button" onClick={() => void remove(item.id)} className="rounded-lg bg-red-600 px-3 py-2 text-white">Supprimer</button></div></td></tr>)}</tbody>
      </table></div>}
    </div></div>
  </main>;
}
