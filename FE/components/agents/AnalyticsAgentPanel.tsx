"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Activity, AlertCircle, Bot, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { automationApi } from "@/services/automation.service";
import { agentApi, createIdempotencyKey } from "@/services/agent.service";
import type { AgentJobDetail } from "@/types/agent";

function localDateInput(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function dateRange(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  end.setDate(end.getDate() + 1);
  end.setMilliseconds(-1);
  return { start, end };
}

function analyticsOutput(job: AgentJobDetail | undefined) {
  const result = job?.runs.find((run) => run.status === "SUCCEEDED")?.outputJson;
  if (!result || typeof result !== "object" || Array.isArray(result)) return null;
  const value = result as Record<string, unknown>;
  if (typeof value.summary !== "string") return null;
  return {
    summary: value.summary,
    recommendations: Array.isArray(value.recommendations)
      ? value.recommendations.filter((item): item is string => typeof item === "string")
      : [],
  };
}

export function AnalyticsAgentPanel() {
  const today = useMemo(() => new Date(), []);
  const monthAgo = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  }, []);
  const [campaignId, setCampaignId] = useState("");
  const [periodStart, setPeriodStart] = useState(() => localDateInput(monthAgo));
  const [periodEnd, setPeriodEnd] = useState(() => localDateInput(today));
  const [jobId, setJobId] = useState<string | null>(null);

  const campaigns = useQuery({ queryKey: ["campaigns"], queryFn: () => automationApi.campaigns() });
  const configuration = useQuery({ queryKey: ["automation-configuration"], queryFn: automationApi.configuration });
  const range = useMemo(() => dateRange(periodStart, periodEnd), [periodStart, periodEnd]);
  const isValidRange = !Number.isNaN(range.start.getTime()) && !Number.isNaN(range.end.getTime()) && range.start <= range.end;

  const queue = useMutation({
    mutationFn: () => agentApi.queueAnalytics({
      campaignId: campaignId || null,
      periodStart: range.start.toISOString(),
      periodEnd: range.end.toISOString(),
    }, createIdempotencyKey("analytics")),
    onSuccess: (job) => setJobId(job.id),
  });

  const job = useQuery({
    queryKey: ["agent-job", jobId],
    queryFn: () => agentApi.job(jobId!),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "QUEUED" || status === "RUNNING" ? 2500 : false;
    },
  });
  const output = analyticsOutput(job.data);
  const availableCampaigns = campaigns.data?.items ?? [];
  const isBusy = job.data?.status === "QUEUED" || job.data?.status === "RUNNING";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> AI analytics agent</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Summarize funnel activity for a date range and optional campaign.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            <Bot className="h-3.5 w-3.5" /> {configuration.data?.aiProvider ?? "Checking provider"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {configuration.data && !configuration.data.aiConfigured && <p className="rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">Model-backed inference is not enabled. Jobs will use the configured deterministic fallback.</p>}
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <label className="space-y-1 text-sm">Campaign
            <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={campaignId} onChange={(event) => setCampaignId(event.target.value)}>
              <option value="">All campaigns</option>
              {availableCampaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name} · {campaign.status.toLowerCase()}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm">From<input className="h-10 w-full rounded-md border bg-background px-3 text-sm" type="date" value={periodStart} max={periodEnd} onChange={(event) => setPeriodStart(event.target.value)} /></label>
          <label className="space-y-1 text-sm">Through<input className="h-10 w-full rounded-md border bg-background px-3 text-sm" type="date" value={periodEnd} min={periodStart} max={localDateInput(today)} onChange={(event) => setPeriodEnd(event.target.value)} /></label>
          <Button onClick={() => queue.mutate()} disabled={!isValidRange || queue.isPending || isBusy}>
            <Sparkles className="mr-2 h-4 w-4" />{queue.isPending ? "Queueing…" : isBusy ? "Analyzing…" : "Run analysis"}
          </Button>
        </div>

        {campaigns.isError && <p role="alert" className="text-sm text-destructive">Campaigns could not be loaded. You can still run an organization-wide analysis.</p>}
        {queue.isError && <p role="alert" className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4" />The analytics job could not be queued. Try again.</p>}
        {job.isError && <p role="alert" className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4" />Could not load the analytics job status.</p>}
        {job.data && <div className="rounded-lg border bg-muted/20 p-4" role="status" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">Analytics job: {job.data.status.toLowerCase()}</p>
            {job.data.runs[0] && <span className="text-xs text-muted-foreground">Model: {job.data.runs[0].model}</span>}
          </div>
          {job.data.errorMessage && <p className="mt-2 text-sm text-destructive">{job.data.errorMessage}</p>}
          {output && <div className="mt-3 space-y-2"><p className="text-sm leading-6">{output.summary}</p>{output.recommendations.length > 0 && <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">{output.recommendations.map((recommendation, index) => <li key={`${index}-${recommendation}`}>{recommendation}</li>)}</ul>}</div>}
          {job.data.status === "COMPLETED" && !output && <p className="mt-2 text-sm text-muted-foreground">Analysis completed, but no summary was returned.</p>}
        </div>}
      </CardContent>
    </Card>
  );
}
