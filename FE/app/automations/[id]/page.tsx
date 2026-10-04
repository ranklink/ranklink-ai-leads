"use client";

import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StatusBadge } from "@/components/automations/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { automationApi } from "@/services/automation.service";
import { useToast } from "@/components/ui/toast";

export default function AutomationRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [recipientEmail, setRecipientEmail] = useState<Record<string, string>>({});
  const run = useQuery({ queryKey: ["automation-run", id], queryFn: () => automationApi.run(id), refetchInterval: query => query.state.data?.status === "RUNNING" || query.state.data?.status === "WAITING" ? 3000 : false });
  const review = useMutation({
    mutationFn: (input: { id: string; version: number; decision: "APPROVED" | "REJECTED" }) => automationApi.review(input.id, input.version, input.decision, recipientEmail[input.id]),
    onSuccess: (_, input) => { toast({ variant: "success", title: `Assessment ${input.decision.toLowerCase()}`, description: input.decision === "APPROVED" ? "The outreach draft will be generated." : "This lead will not enter outreach." }); void queryClient.invalidateQueries({ queryKey: ["automation-run", id] }); },
  });
  const control = useMutation({
    mutationFn: (type: "cancel" | "retry") => type === "cancel" ? automationApi.cancel(id) : automationApi.retry(id),
    onSuccess: () => { toast({ variant: "success", title: "Run updated", description: "The worker state has been refreshed." }); void queryClient.invalidateQueries({ queryKey: ["automation-run", id] }); },
  });

  if (run.isLoading) return <p>Loading run…</p>;
  if (run.error || !run.data) return <p role="alert" className="text-red-700">{run.error instanceof Error ? run.error.message : "Run not found."}</p>;
  const detail = run.data;
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm text-muted-foreground">{detail.campaign.name}</p><h1 className="mt-1 text-3xl font-bold">Agent run</h1><div className="mt-2 flex flex-wrap items-center gap-2"><StatusBadge status={detail.status} /><span className="text-sm text-muted-foreground">Stage: {detail.stage}</span></div></div><div className="flex gap-2">{["QUEUED", "RUNNING"].includes(detail.status) && <Button variant="outline" onClick={() => control.mutate("cancel")} disabled={control.isPending}>Cancel</Button>}{detail.status === "FAILED" && <Button onClick={() => control.mutate("retry")} disabled={control.isPending}>Retry</Button>}</div></div>
    <div className="grid gap-4 sm:grid-cols-3"><Metric label="Attempts" value={detail.attempts} /><Metric label="AI calls" value={`${detail.aiCalls}/${detail.config.maxAiCalls}`} /><Metric label="Google calls" value={`${detail.googleCalls}/${detail.config.maxGoogleCalls}`} /></div>
    <Card><CardHeader><CardTitle>Qualification queue</CardTitle></CardHeader><CardContent className="space-y-4">
      {!detail.assessments.length && <p className="text-sm text-muted-foreground">Assessments will appear after discovery completes.</p>}
      {detail.assessments.map(assessment => <div key={assessment.id} className="rounded-lg border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium">{assessment.lead.name}</p><p className="mt-1 text-sm text-muted-foreground">Score {assessment.lead.leadScore} · {assessment.decision || "Pending decision"}</p></div><StatusBadge status={assessment.status} /></div>{assessment.reason && <p className="mt-3 text-sm">{assessment.reason}</p>}{assessment.subject && <div className="mt-3 rounded-md bg-muted/50 p-3 text-sm"><p className="font-medium">{assessment.subject}</p><p className="mt-2 whitespace-pre-wrap text-muted-foreground">{assessment.body}</p></div>}{assessment.status === "REVIEW" && !assessment.subject && <div className="mt-4 flex flex-col gap-2 sm:flex-row"><input type="email" aria-label={`Recipient email for ${assessment.lead.name}`} placeholder="Recipient email (required to draft)" className="h-10 flex-1 rounded-md border bg-background px-3 text-sm" value={recipientEmail[assessment.id] || ""} onChange={event => setRecipientEmail(previous => ({ ...previous, [assessment.id]: event.target.value }))} /><Button onClick={() => review.mutate({ id: assessment.id, version: assessment.version, decision: "APPROVED" })} disabled={review.isPending || !recipientEmail[assessment.id]}>Approve and draft</Button><Button variant="outline" onClick={() => review.mutate({ id: assessment.id, version: assessment.version, decision: "REJECTED" })} disabled={review.isPending}>Reject</Button></div>}</div>)}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Run events</CardTitle></CardHeader><CardContent className="space-y-3">{detail.events.map(event => <div key={event.id} className="border-l-2 border-primary/30 pl-3"><p className="text-sm font-medium">{event.type.replaceAll("_", " ")}</p><p className="text-sm text-muted-foreground">{event.message}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</p></div>)}</CardContent></Card>
  </div>;
}

function Metric({ label, value }: { label: string; value: string | number }) { return <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></CardContent></Card>; }
