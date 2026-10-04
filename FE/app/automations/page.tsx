"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { StatusBadge } from "@/components/automations/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { automationApi } from "@/services/automation.service";
import { useToast } from "@/components/ui/toast";

export default function AutomationsPage() {
  const { toast } = useToast();
  const runs = useQuery({ queryKey: ["automation-runs"], queryFn: () => automationApi.runs(1) });
  async function refresh() {
    try { await runs.refetch(); toast({ variant: "success", title: "Runs refreshed", description: "The latest worker activity is displayed." }); }
    catch (error) { toast({ variant: "error", title: "Refresh failed", description: error instanceof Error ? error.message : "Please try again." }); }
  }
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wide text-primary">Worker activity</p><h1 className="mt-1 text-3xl font-bold">Agent runs</h1><p className="mt-2 text-muted-foreground">Track discovery, qualification, drafting, and outbound delivery.</p></div><Button variant="outline" onClick={refresh} disabled={runs.isFetching}>{runs.isFetching ? "Refreshing…" : "Refresh"}</Button></div>
    <Card><CardHeader><CardTitle>Recent runs</CardTitle></CardHeader><CardContent>
      {runs.isLoading && <p className="text-sm text-muted-foreground">Loading runs…</p>}
      {!runs.isLoading && !runs.data?.items.length && <p className="text-sm text-muted-foreground">No runs yet. Activate a campaign and start a run.</p>}
      <div className="space-y-3">{runs.data?.items.map(run => <Link key={run.id} href={`/automations/${run.id}`} className="block rounded-lg border p-4 transition-colors hover:bg-muted/40"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">{run.campaign.name}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(run.createdAt).toLocaleString()} · {run.stage} · {run._count?.assessments ?? 0} assessments</p></div><StatusBadge status={run.status} /></div><div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3"><span>Attempts: {run.attempts}</span><span>AI calls: {run.aiCalls}</span><span>Google calls: {run.googleCalls}</span></div>{run.errorMessage && <p className="mt-2 text-sm text-red-700">{run.errorMessage}</p>}</Link>)}</div>
    </CardContent></Card>
  </div>;
}
