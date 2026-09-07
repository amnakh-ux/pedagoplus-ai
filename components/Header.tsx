export default function Header() {
  return (
    <header className="flex min-h-16 items-center justify-between gap-4 border-b bg-white px-4 py-3 sm:px-8">

      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Tableau de bord
        </h1>

        <p className="text-gray-500 text-sm">
          Bienvenue sur PedagoPlus AI
        </p>
      </div>

      <div className="flex items-center gap-4">

        <button type="button" disabled className="hidden cursor-not-allowed rounded-lg bg-slate-300 px-5 py-2 text-white sm:block" title="Fonctionnalité à venir">
          Assistant IA
        </button>

        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
          A
        </div>

      </div>

    </header>
  );
}
