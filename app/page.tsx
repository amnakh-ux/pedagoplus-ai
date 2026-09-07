import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import DashboardCard from "@/components/DashboardCard";
import { getCurrentTeacher } from "@/lib/current-teacher";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const teacher = await getCurrentTeacher();
  const repartitionCount = teacher
    ? await prisma.repartition.count({ where: { teacherId: teacher.id } })
    : 0;
  return (
    <main className="flex min-h-screen flex-col bg-slate-100 text-gray-900 lg:flex-row">

      <Sidebar />

      <div className="flex-1">

        <Header />

        <div className="p-4 sm:p-8">

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

            <DashboardCard
              title="Répartitions"
              value={String(repartitionCount)}
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
