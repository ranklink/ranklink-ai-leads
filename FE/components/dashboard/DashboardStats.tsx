"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Flame, Globe, Search } from "lucide-react";

export function DashboardStats({ stats }: { stats: { totalLeads: number; hotLeads: number; withoutWebsite: number; searchesThisMonth: number } }) {
  const items = [
    { label: "Total Leads", value: stats.totalLeads, icon: Users, color: "text-blue-600" },
    { label: "Hot Leads (80+)", value: stats.hotLeads, icon: Flame, color: "text-red-500" },
    { label: "Without Website", value: stats.withoutWebsite, icon: Globe, color: "text-amber-600" },
    { label: "Searches This Month", value: stats.searchesThisMonth, icon: Search, color: "text-green-600" },
  ];
  return (
    <div className="grid md:grid-cols-4 gap-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
            <item.icon className={`w-5 h-5 ${item.color}`} />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{item.value}</div></CardContent>
        </Card>
      ))}
    </div>
  );
}
