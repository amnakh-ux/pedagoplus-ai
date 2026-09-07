import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="w-full border-b bg-white p-6 lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r">
      <h2 className="text-xl font-bold text-blue-700 mb-8">
        PedagoPlus AI
      </h2>

      <nav className="space-y-4">

        <Link href="/" className="block w-full rounded-lg p-3 text-left hover:bg-blue-50">
          🏠 Tableau de bord
        </Link>

        <Link href="/repartition" className="block w-full rounded-lg p-3 text-left hover:bg-blue-50">
          📅 Répartition annuelle
        </Link>

        <Link href="/repartitions" className="block w-full rounded-lg p-3 text-left hover:bg-blue-50">
          Historique des répartitions
        </Link>

        <button type="button" disabled className="w-full cursor-not-allowed rounded-lg p-3 text-left text-slate-400" title="Fonctionnalité à venir">
          📖 Cahier journal
        </button>

        <button type="button" disabled className="w-full cursor-not-allowed rounded-lg p-3 text-left text-slate-400" title="Fonctionnalité à venir">
          📚 Fiches pédagogiques
        </button>

        <button type="button" disabled className="w-full cursor-not-allowed rounded-lg p-3 text-left text-slate-400" title="Fonctionnalité à venir">
          📝 Évaluations
        </button>

        <button type="button" disabled className="w-full cursor-not-allowed rounded-lg p-3 text-left text-slate-400" title="Fonctionnalité à venir">
          🤖 Assistant IA
        </button>

        <button type="button" disabled className="w-full cursor-not-allowed rounded-lg p-3 text-left text-slate-400" title="Fonctionnalité à venir">
          ⚙️ Paramètres
        </button>

      </nav>
    </aside>
  );
}
