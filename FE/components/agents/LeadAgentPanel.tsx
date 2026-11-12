"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, ArrowUpRight, Bot, Check, Clock3, Mail, Search, ShieldAlert, Sparkles, Target, Users, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { automationApi } from "@/services/automation.service";
import { agentApi, createIdempotencyKey } from "@/services/agent.service";
import type { AgentJobStatus, AgentType, LeadAgentSummary } from "@/types/agent";
import type { Lead } from "@/types/lead";

const AGENT_STAGES: { type: AgentType; label: string; description: string; icon: typeof Search }[] = [
  { type: "RESEARCH", label: "Research", description: "Collects cited business evidence", icon: Search },
  { type: "QUALIFICATION", label: "Qualification", description: "Scores fit against campaign criteria", icon: Target },
  { type: "CONTACT_ENRICHMENT", label: "Contact enrichment", description: "Finds and verifies business contacts", icon: Users },
  { type: "OUTREACH", label: "Outreach", description: "Prepares a reviewed message draft", icon: Mail },
  { type: "FOLLOW_UP", label: "Follow-up", description: "Plans a policy controlled follow-up", icon: Clock3 },
];

type DraftEdit = { subject: string; body: string; recipientEmail: string; recipientName: string };

function activeJob(summary: LeadAgentSummary | undefined, type: AgentType) {
  return summary?.agentJobs.find((job) => job.type === type);
}

function jobLabel(status: AgentJobStatus | undefined) {
  if (status === "QUEUED") return "Queued";
  if (status === "RUNNING") return "Running";
  if (status === "COMPLETED") return "Complete";
  if (status === "FAILED") return "Failed";
  if (status === "CANCELLED") return "Cancelled";
  return "Not started";
}

function confidence(value: number) {
  return `${Math.round(value * 100)}% confidence`;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function isAgentBusy(summary: LeadAgentSummary | undefined) {
  return summary?.agentJobs.some((job) => job.status === "QUEUED" || job.status === "RUNNING") ?? false;
}

export function LeadAgentPanel({ lead }: { lead: Lead }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [campaignId, setCampaignId] = useState("");
  const [draftEditId, setDraftEditId] = useState<string | null>(null);
  const [draftEdit, setDraftEdit] = useState<DraftEdit | null>(null);
  const summary = useQuery({
    queryKey: ["lead-agent-summary", lead.id],
    queryFn: () => agentApi.leadSummary(lead.id),
    refetchInterval: (query) => isAgentBusy(query.state.data) ? 3000 : false,
  });
  const campaigns = useQuery({ queryKey: ["campaigns"], queryFn: () => automationApi.campaigns() });
  const configuration = useQuery({ queryKey: ["automation-configuration"], queryFn: automationApi.configuration });
  const activeCampaigns = useMemo(() => campaigns.data?.items.filter((campaign) => campaign.status === "ACTIVE") ?? [], [campaigns.data]);
  const selectedCampaignId = activeCampaigns.some((campaign) => campaign.id === campaignId) ? campaignId : activeCampaigns[0]?.id ?? "";
  const latestResearch = summary.data?.researchSnapshots[0];
  const latestQualification = summary.data?.qualifications[0];
  const latestDraft = summary.data?.outreachDrafts[0];
  const latestFollowUp = summary.data?.followUpPlans[0];

  const research = useMutation({
    mutationFn: () => agentApi.queueResearch(lead.id, selectedCampaignId, createIdempotencyKey(`research:${lead.id}`)),
    onSuccess: () => {
      toast({ variant: "success", title: "Research queued", description: "Research and the next eligible agent stages will run in the background." });
      void queryClient.invalidateQueries({ queryKey: ["lead-agent-summary", lead.id] });
    },
  });
  const saveDraft = useMutation({
    mutationFn: ({ id, version, values }: { id: string; version: number; values: DraftEdit }) => agentApi.updateDraft(id, {
      version,
      subject: values.subject,
      body: values.body,
      recipientEmail: values.recipientEmail,
      recipientName: values.recipientName || null,
    }),
    onSuccess: () => {
      setDraftEditId(null);
      setDraftEdit(null);
      toast({ variant: "success", title: "Draft saved", description: "The updated draft is ready for review." });
      void queryClient.invalidateQueries({ queryKey: ["lead-agent-summary", lead.id] });
    },
  });
  const reviewDraft = useMutation({
    mutationFn: ({ id, version, decision }: { id: string; version: number; decision: "APPROVED" | "REJECTED" }) => agentApi.reviewDraft(id, { version, decision }),
    onSuccess: (_, input) => {
      toast({ variant: "success", title: input.decision === "APPROVED" ? "Draft approved" : "Draft rejected", description: "The review decision was recorded." });
      void queryClient.invalidateQueries({ queryKey: ["lead-agent-summary", lead.id] });
    },
  });
  const sendDraft = useMutation({
    mutationFn: (id: string) => agentApi.sendDraft(id, createIdempotencyKey(`send:${id}`)),
    onSuccess: () => {
      toast({ variant: "success", title: "Message sent", description: "The outreach event was recorded." });
      void queryClient.invalidateQueries({ queryKey: ["lead-agent-summary", lead.id] });
    },
  });
  const retryJob = useMutation({
    mutationFn: (id: string) => agentApi.retryJob(id),
    onSuccess: (job) => {
      toast({
        variant: "success",
        title: job.status === "COMPLETED" ? "Saved output recovered" : "Agent job queued",
        description: job.status === "COMPLETED" ? "The existing output was recovered without generating it again." : "The failed job will retry in the background.",
      });
      void queryClient.invalidateQueries({ queryKey: ["lead-agent-summary", lead.id] });
    },
    onError: (error) => toast({ variant: "error", title: "Could not retry this job", description: error instanceof Error ? error.message : "Reload and try again." }),
  });
  const reviewFollowUp = useMutation({
    mutationFn: ({ id, version, decision }: { id: string; version: number; decision: "APPROVED" | "CANCELLED" }) => agentApi.reviewFollowUp(id, { version, decision }),
    onSuccess: (_, input) => {
      toast({ variant: "success", title: input.decision === "APPROVED" ? "Follow-up approved" : "Follow-up cancelled", description: input.decision === "APPROVED" ? "It will be sent at the scheduled time if outbound sending is enabled." : "The follow-up will not be sent." });
      void queryClient.invalidateQueries({ queryKey: ["lead-agent-summary", lead.id] });
    },
    onError: (error) => toast({ variant: "error", title: "Could not update the follow-up", description: error instanceof Error ? error.message : "Reload and try again." }),
  });

  function beginDraftEdit() {
    if (!latestDraft) return;
    setDraftEditId(latestDraft.id);
    setDraftEdit({ subject: latestDraft.subject, body: latestDraft.body, recipientEmail: latestDraft.recipientEmail ?? "", recipientName: latestDraft.recipientName ?? "" });
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-primary" /> AI agent pipeline</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Run research, qualify this lead, find a contact, and review any generated outreach.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <select aria-label="Research campaign" className="h-10 min-w-44 rounded-md border bg-background px-3 text-sm" value={selectedCampaignId} onChange={(event) => setCampaignId(event.target.value)} disabled={!activeCampaigns.length}>
            {!activeCampaigns.length && <option value="">No active campaign</option>}
            {activeCampaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
          </select>
          <Button onClick={() => research.mutate()} disabled={!selectedCampaignId || research.isPending || summary.isLoading || isAgentBusy(summary.data)}>
            <Sparkles className="mr-2 h-4 w-4" />{research.isPending ? "Queueing…" : "Run research"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {configuration.data && !configuration.data.aiConfigured && <p className="rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">Model-backed inference is not enabled ({configuration.data.aiProvider}). Agent jobs use the deterministic fallback until a model provider is enabled.</p>}
        {!activeCampaigns.length && <p className="rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">Activate a campaign before starting agent research. <Link href="/campaigns" className="font-medium underline">Manage campaigns</Link></p>}
        {summary.isLoading && <p className="text-sm text-muted-foreground" role="status">Loading agent activity…</p>}
        {summary.isError && <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/40 p-3 text-sm" role="alert"><span>Could not load this lead’s agent activity.</span><Button variant="outline" size="sm" onClick={() => void summary.refetch()}>Retry</Button></div>}

        {summary.data && <>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5" aria-label="Agent pipeline status">
            {AGENT_STAGES.map((stage) => {
              const job = activeJob(summary.data, stage.type);
              const Icon = stage.icon;
              return <div key={stage.type} className="rounded-lg border bg-card p-3">
                <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2 text-sm font-medium"><Icon className="h-4 w-4 text-primary" />{stage.label}</span><span className={`rounded-full px-2 py-0.5 text-[11px] ${job?.status === "FAILED" ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" : job?.status === "COMPLETED" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "bg-muted text-muted-foreground"}`}>{jobLabel(job?.status)}</span></div>
                <p className="mt-2 text-xs text-muted-foreground">{stage.description}</p>
                {job?.errorCode && <p className="mt-2 flex items-start gap-1 text-xs text-destructive"><ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />{job.errorMessage || job.errorCode}</p>}
                {job?.automationRunId && job.type === "QUALIFICATION" && <Link className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary underline" href={`/automations/${encodeURIComponent(job.automationRunId)}`}>Open review <ArrowUpRight className="h-3 w-3" /></Link>}
              </div>;
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-lg border p-4" aria-labelledby="lead-research-heading">
              <h3 id="lead-research-heading" className="font-semibold">Research and qualification</h3>
              {!latestResearch && <p className="mt-2 text-sm text-muted-foreground">No research has run for this lead yet.</p>}
              {latestResearch && <div className="mt-3 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-muted-foreground">Research v{latestResearch.version} · {confidence(latestResearch.confidence)}</span><span className="text-xs text-muted-foreground">{new Date(latestResearch.createdAt).toLocaleString()}</span></div>
                <p className="text-sm leading-6">{latestResearch.summary}</p>
                {Array.isArray(latestResearch.signals) && latestResearch.signals.length > 0 && <ul className="space-y-2">{(latestResearch.signals as { type: string; value: string; confidence: number }[]).map((signal, index) => <li key={`${signal.type}-${index}`} className="rounded-md bg-muted/50 p-2 text-sm"><span className="font-medium">{signal.type.replaceAll("_", " ")}</span><span className="text-muted-foreground"> · {signal.value}</span></li>)}</ul>}
                {stringList(latestResearch.missingFields).length > 0 && <p className="text-xs text-muted-foreground">Still missing: {stringList(latestResearch.missingFields).join(", ")}</p>}
              </div>}
              {latestQualification && <div className="mt-4 border-t pt-3">
                <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-semibold">Fit score {latestQualification.score}/100 · {latestQualification.fit}</h4><span className="text-xs text-muted-foreground">{confidence(latestQualification.confidence)}</span></div>
                <p className="mt-1 text-sm text-muted-foreground">{latestQualification.recommendedAction.replaceAll("_", " ")}</p>
                {stringList(latestQualification.reasons).length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{stringList(latestQualification.reasons).map((reason, index) => <li key={index}>{reason}</li>)}</ul>}
                {stringList(latestQualification.risks).length > 0 && <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">Risks: {stringList(latestQualification.risks).join(" · ")}</p>}
              </div>}
            </section>

            <section className="rounded-lg border p-4" aria-labelledby="lead-contacts-heading">
              <div className="flex items-center justify-between gap-2"><h3 id="lead-contacts-heading" className="font-semibold">Enriched contacts</h3><span className="rounded-full bg-muted px-2 py-1 text-xs">{summary.data.contacts.length}</span></div>
              {!summary.data.contacts.length && <p className="mt-2 text-sm text-muted-foreground">Contact enrichment runs after research when the lead has a website and provider access is configured.</p>}
              <div className="mt-3 space-y-2">{summary.data.contacts.map((contact) => <div key={contact.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted/40 p-3">
                <div className="min-w-0"><p className="truncate text-sm font-medium">{contact.name || contact.email}</p><p className="truncate text-xs text-muted-foreground">{contact.role || "Contact"} · {contact.email}</p></div>
                <div className="text-right text-xs text-muted-foreground"><p>{contact.verificationStatus || "Unverified"}</p><p>{confidence(contact.confidence)}</p></div>
              </div>)}</div>
            </section>
          </div>

          <section className="rounded-lg border p-4" aria-labelledby="lead-draft-heading">
            <div className="flex flex-wrap items-center justify-between gap-2"><h3 id="lead-draft-heading" className="font-semibold">Outreach draft</h3>{latestDraft && <span className="rounded-full bg-muted px-2 py-1 text-xs">{latestDraft.status} · v{latestDraft.version}</span>}</div>
            {!latestDraft && <p className="mt-2 text-sm text-muted-foreground">A draft appears here after an eligible campaign lead is approved for outreach.</p>}
            {latestDraft && <div className="mt-3 space-y-3">
              {draftEditId === latestDraft.id && draftEdit ? <>
                <label className="block space-y-1 text-sm">Subject<Input maxLength={200} value={draftEdit.subject} onChange={(event) => setDraftEdit({ ...draftEdit, subject: event.target.value })} /></label>
                <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-sm">Recipient email<Input type="email" required value={draftEdit.recipientEmail} onChange={(event) => setDraftEdit({ ...draftEdit, recipientEmail: event.target.value })} /></label><label className="space-y-1 text-sm">Recipient name<Input value={draftEdit.recipientName} onChange={(event) => setDraftEdit({ ...draftEdit, recipientName: event.target.value })} /></label></div>
                <label className="block space-y-1 text-sm">Message<textarea maxLength={5000} rows={7} className="w-full rounded-md border bg-background p-3 text-sm" value={draftEdit.body} onChange={(event) => setDraftEdit({ ...draftEdit, body: event.target.value })} /></label>
                <div className="flex gap-2"><Button onClick={() => saveDraft.mutate({ id: latestDraft.id, version: latestDraft.version, values: draftEdit })} disabled={saveDraft.isPending || !draftEdit.subject.trim() || !draftEdit.body.trim() || !/^\S+@\S+\.\S+$/.test(draftEdit.recipientEmail)}>{saveDraft.isPending ? "Saving…" : "Save changes"}</Button><Button variant="outline" onClick={() => { setDraftEditId(null); setDraftEdit(null); }}>Cancel</Button></div>
              </> : <>
                <p className="font-medium">{latestDraft.subject}</p><p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{latestDraft.body}</p>
                <p className="text-xs text-muted-foreground">To: {latestDraft.recipientName ? `${latestDraft.recipientName} · ` : ""}{latestDraft.recipientEmail || "No recipient set"}</p>
                <div className="flex flex-wrap gap-2">
                  {latestDraft.status !== "SENT" && <Button variant="outline" size="sm" onClick={beginDraftEdit}>Edit draft</Button>}
                  {latestDraft.status === "REVIEW" && <>
                    <Button size="sm" onClick={() => reviewDraft.mutate({ id: latestDraft.id, version: latestDraft.version, decision: "APPROVED" })} disabled={reviewDraft.isPending || !latestDraft.recipientEmail}>{reviewDraft.isPending ? "Saving review…" : <><Check className="mr-1 h-4 w-4" />Approve draft</>}</Button>
                    <Button size="sm" variant="outline" onClick={() => reviewDraft.mutate({ id: latestDraft.id, version: latestDraft.version, decision: "REJECTED" })} disabled={reviewDraft.isPending}><X className="mr-1 h-4 w-4" />Reject</Button>
                  </>}
                  {latestDraft.status === "APPROVED" && <Button size="sm" onClick={() => { if (window.confirm(`Send this approved message to ${latestDraft.recipientEmail}?`)) sendDraft.mutate(latestDraft.id); }} disabled={sendDraft.isPending || !configuration.data?.outboundConfigured}>{sendDraft.isPending ? "Sending…" : "Send approved message"}</Button>}
                </div>
                {latestDraft.status === "APPROVED" && !configuration.data?.outboundConfigured && <p className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200"><ShieldAlert className="h-4 w-4 shrink-0" />Outbound sending is disabled or not configured. The draft remains saved and approved.</p>}
              </>}
            </div>}
          </section>

          <section className="rounded-lg border p-4" aria-labelledby="lead-follow-up-heading">
            <div className="flex items-center justify-between gap-2"><h3 id="lead-follow-up-heading" className="font-semibold">Follow-up plan</h3>{latestFollowUp && <span className="rounded-full bg-muted px-2 py-1 text-xs">{latestFollowUp.status}</span>}</div>
            {!latestFollowUp && <p className="mt-2 text-sm text-muted-foreground">Follow-up planning starts after a campaign outreach message is sent with follow-up enabled.</p>}
          {latestFollowUp && <div className="mt-3 space-y-2"><p className="text-sm font-medium">{latestFollowUp.subject}</p><p className="whitespace-pre-wrap text-sm text-muted-foreground">{latestFollowUp.body}</p><p className="text-xs text-muted-foreground">{latestFollowUp.reason} · due {new Date(latestFollowUp.dueAt).toLocaleString()}</p>{latestFollowUp.status === "PROPOSED" && <p className="text-xs text-muted-foreground">Approval schedules this message for automatic sending at the due time when outbound sending is enabled.</p>}<div className="flex flex-wrap gap-2">{latestFollowUp.status === "PROPOSED" && <Button size="sm" onClick={() => reviewFollowUp.mutate({ id: latestFollowUp.id, version: latestFollowUp.version, decision: "APPROVED" })} disabled={reviewFollowUp.isPending}>Approve scheduled follow-up</Button>}{["PROPOSED", "APPROVED"].includes(latestFollowUp.status) && <Button size="sm" variant="outline" onClick={() => reviewFollowUp.mutate({ id: latestFollowUp.id, version: latestFollowUp.version, decision: "CANCELLED" })} disabled={reviewFollowUp.isPending}>Cancel follow-up</Button>}</div></div>}
          </section>

          <section className="rounded-lg border p-4" aria-labelledby="lead-agent-history-heading">
            <div className="flex items-center justify-between"><h3 id="lead-agent-history-heading" className="font-semibold">Agent job history</h3><span className="flex items-center gap-1 text-xs text-muted-foreground"><Activity className="h-3.5 w-3.5" />{summary.data.agentJobs.length} jobs</span></div>
            {!summary.data.agentJobs.length && <p className="mt-2 text-sm text-muted-foreground">Agent runs will appear here after the first research job.</p>}
            <div className="mt-3 divide-y">{summary.data.agentJobs.map((job) => <div key={job.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <div><p className="font-medium">{job.type.replaceAll("_", " ")}</p><p className="text-xs text-muted-foreground">{new Date(job.createdAt).toLocaleString()} · {job.attempts}/{job.maxAttempts} attempts</p></div>
              <div className="flex flex-wrap items-center justify-end gap-2"><div className="text-right"><span className="text-xs text-muted-foreground">{jobLabel(job.status)}</span>{job.runs[0] && <p className="text-xs text-muted-foreground">{job.runs[0].model} · {job.runs[0].latencyMs} ms</p>}{job.errorCode && <p className="text-xs text-destructive">{job.errorCode}</p>}</div>{job.status === "FAILED" && <Button size="sm" variant="outline" onClick={() => retryJob.mutate(job.id)} disabled={retryJob.isPending}>{retryJob.isPending ? "Queueing…" : "Retry"}</Button>}</div>
            </div>)}</div>
          </section>
        </>}
      </CardContent>
    </Card>
  );
}
