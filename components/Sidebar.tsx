export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r min-h-screen p-6">
      <h2 className="text-xl font-bold text-blue-700 mb-8">
        PedagoPlus AI
      </h2>

      <nav className="space-y-4">

        <button className="w-full text-left p-3 rounded-lg hover:bg-blue-50">
          🏠 Tableau de bord
        </button>

        <button className="w-full text-left p-3 rounded-lg hover:bg-blue-50">
          📅 Répartition annuelle
        </button>

        <button className="w-full text-left p-3 rounded-lg hover:bg-blue-50">
          📖 Cahier journal
        </button>

        <button className="w-full text-left p-3 rounded-lg hover:bg-blue-50">
          📚 Fiches pédagogiques
        </button>

        <button className="w-full text-left p-3 rounded-lg hover:bg-blue-50">
          📝 Évaluations
        </button>

        <button className="w-full text-left p-3 rounded-lg hover:bg-blue-50">
          🤖 Assistant IA
        </button>

        <button className="w-full text-left p-3 rounded-lg hover:bg-blue-50">
          ⚙️ Paramètres
        </button>

      </nav>
    </aside>
  );
}