export default function Header() {
  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-8">

      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Tableau de bord
        </h1>

        <p className="text-gray-500 text-sm">
          Bienvenue sur PedagoPlus AI
        </p>
      </div>

      <div className="flex items-center gap-4">

        <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg">
          Assistant IA
        </button>

        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
          A
        </div>

      </div>

    </header>
  );
}