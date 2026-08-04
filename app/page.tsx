import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import DashboardCard from "@/components/DashboardCard";

export default function Home() {
  return (
    <main className="flex min-h-screen bg-slate-100 text-gray-900">

      <Sidebar />

      <div className="flex-1">

        <Header />

        <div className="p-8">

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

            <DashboardCard
              title="Répartitions"
              value="0"
            />

            <DashboardCard
              title="Cahiers journaux"
              value="0"
            />

            <DashboardCard
              title="Évaluations"
              value="0"
            />

            <DashboardCard
              title="Documents"
              value="0"
            />

          </div>

        </div>

      </div>

    </main>
  );
}