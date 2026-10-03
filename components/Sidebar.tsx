import Link from "next/link";
const items = [
  ["Tableau de bord","/"],["Répartition annuelle","/repartition"],["Cahier journal","/cahier-journal"],
  ["Fiches pédagogiques",null],["Générateur d’exercices","/exercices"],["Évaluations",null],
  ["Documents","/documents"],["Assistant IA",null],["Paramètres","/parametres"],
] as const;
export default function Sidebar() {
  return <aside className="no-print w-full border-b bg-white p-4 lg:min-h-screen lg:w-64 lg:shrink-0 lg:border-r">
    <Link href="/" className="mb-6 block text-xl font-bold text-blue-700">PedagoPlus AI</Link>
    <nav aria-label="Navigation principale" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">{items.map(([label,href])=>href
      ? <Link key={label} href={href} className="rounded-lg p-3 hover:bg-blue-50">{label}</Link>
      : <span key={label} className="p-3 text-slate-500">{label} <small>— À venir</small></span>)}</nav>
  </aside>;
}
