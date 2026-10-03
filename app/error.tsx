"use client";
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="p-8"><h1 className="text-xl font-bold">Impossible de charger cette page.</h1><p className="my-4">Vérifiez votre connexion et réessayez.</p><button onClick={reset} className="rounded bg-blue-600 px-4 py-2 text-white">Réessayer</button></main>;}
