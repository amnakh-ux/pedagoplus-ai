import { UserButton } from "@clerk/nextjs";
export default function Header() {
  return <header className="no-print flex items-center justify-between border-b bg-white px-4 py-4 sm:px-8">
    <div><h1 className="text-2xl font-bold">Tableau de bord</h1><p className="text-sm text-slate-600">Bienvenue sur PedagoPlus AI</p></div>
    <UserButton />
  </header>;
}
