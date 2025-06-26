import { useQuery } from "@tanstack/react-query";
import { Building, Banknote, Users, AlertTriangle } from "lucide-react";

interface DashboardStats {
  totalProperties: number;
  occupiedProperties: number;
  monthlyRevenue: number;
  expiringSoon: number;
  expiringCritical: number;
}

const StatCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  iconBg, 
  trend 
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: any;
  iconBg: string;
  trend?: string;
}) => (
  <div className="glass-card rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>
      <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center`}>
        <Icon className="text-xl" />
      </div>
    </div>
    <div className="mt-4 flex items-center text-sm">
      {trend && (
        <>
          <span className="text-green-600 font-medium">{trend}</span>
          <span className="text-gray-500 ml-2">from last month</span>
        </>
      )}
      {!trend && <span className="text-gray-500">{subtitle}</span>}
    </div>
  </div>
);

export default function StatsCards() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    staleTime: 0, // Always fetch fresh data for dashboard stats
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-card rounded-2xl p-6 shadow-lg animate-pulse">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
            </div>
            <div className="mt-4 h-4 bg-gray-200 rounded w-32"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const occupancyRate = stats.totalProperties > 0 
    ? Math.round((stats.occupiedProperties / stats.totalProperties) * 100)
    : 0;

  const totalExpiring = stats.expiringSoon + stats.expiringCritical;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatCard
        title="Total Properties"
        value={stats.totalProperties}
        subtitle={`${stats.totalProperties} properties managed`}
        icon={Building}
        iconBg="bg-primary/10 text-primary"
      />
      
      <StatCard
        title="Monthly Revenue"
        value={`R${stats.monthlyRevenue.toLocaleString()}`}
        subtitle={`From ${stats.occupiedProperties} occupied properties`}
        icon={Banknote}
        iconBg="bg-green-100 text-green-600"
      />
      
      <StatCard
        title="Occupied Properties"
        value={stats.occupiedProperties}
        subtitle={`${occupancyRate}% occupancy rate`}
        icon={Users}
        iconBg="bg-green-100 text-green-600"
      />
      
      <StatCard
        title="Expiring Soon"
        value={totalExpiring}
        subtitle={totalExpiring > 0 ? "Requires attention" : "All good"}
        icon={AlertTriangle}
        iconBg={totalExpiring > 0 ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-600"}
      />
    </div>
  );
}
