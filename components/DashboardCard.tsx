type DashboardCardProps = {
  title: string;
  value: string;
};

export default function DashboardCard({
  title,
  value,
}: DashboardCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <h3 className="text-gray-500 text-sm">{title}</h3>

      <p className="text-4xl font-bold text-blue-700 mt-3">
        {value}
      </p>
    </div>
  );
}