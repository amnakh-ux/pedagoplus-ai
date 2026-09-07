import Link from "next/link";
import { redirect } from "next/navigation";

type RepartitionChoicePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RepartitionChoicePage({
  searchParams,
}: RepartitionChoicePageProps) {
  const params = await searchParams;

  // Preserve links previously created by the history page and bookmarks.
  if (params.id) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        value.forEach((item) => query.append(key, item));
      } else if (value !== undefined) {
        query.set(key, value);
      }
    }
    redirect(`/repartition/lecons?${query.toString()}`);
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold text-slate-900">
          Créer une répartition
        </h1>
        <p className="mt-2 text-slate-600">
          Choisissez le type de répartition que vous souhaitez préparer.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Link
            href="/repartition/vierge"
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl" aria-hidden="true">
              📅
            </div>
            <h2 className="mt-5 text-xl font-semibold text-slate-900 group-hover:text-blue-700">
              Répartition annuelle vierge
            </h2>
            <p className="mt-2 text-slate-600">
              Commencez une répartition annuelle vide à partir des dates de
              votre année scolaire.
            </p>
            <span className="mt-6 inline-block font-semibold text-blue-700">
              Commencer →
            </span>
          </Link>

          <Link
            href="/repartition/lecons"
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl" aria-hidden="true">
              📚
            </div>
            <h2 className="mt-5 text-xl font-semibold text-slate-900 group-hover:text-blue-700">
              Répartition des leçons
            </h2>
            <p className="mt-2 text-slate-600">
              Organisez vos unités et vos leçons avec le formulaire complet.
            </p>
            <span className="mt-6 inline-block font-semibold text-blue-700">
              Continuer →
            </span>
          </Link>
        </div>

        <Link
          href="/repartitions"
          className="mt-8 inline-block text-sm font-semibold text-blue-700 hover:underline"
        >
          Voir l’historique des répartitions
        </Link>
      </div>
    </main>
  );
}
