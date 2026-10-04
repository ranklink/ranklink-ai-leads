"use client";
import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "@/services/dashboard.service";
import { getSearches } from "@/services/searches.service";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { RecentSearches } from "@/components/dashboard/RecentSearches";

export default function DashboardPage() {
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboardStats(),
  });

  const { data: searchesData } = useQuery({
    queryKey: ["searches", 1],
    queryFn: () => getSearches(1, 10),
  });

  if (statsLoading) return <p>Loading dashboard...</p>;
  if (!statsData) return <p>Failed to load stats. Ensure backend is running.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <DashboardStats stats={statsData.data} />
      <RecentSearches searches={searchesData?.data?.items || []} />
    </div>
  );
}
