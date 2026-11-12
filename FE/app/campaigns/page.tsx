"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CampaignForm } from "@/components/campaigns/CampaignForm";
import { StatusBadge } from "@/components/automations/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { automationApi } from "@/services/automation.service";
import type { Campaign, CampaignConfig } from "@/types/automation";
import { useToast } from "@/components/ui/toast";
import Link from "next/link";

function requestKey(prefix: string) {
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
}

export default function CampaignsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Campaign | undefined>();
  const [showForm, setShowForm] = useState(false);
  const campaigns = useQuery({ queryKey: ["campaigns"], queryFn: () => automationApi.campaigns() });
  const configuration = useQuery({ queryKey: ["automation-configuration"], queryFn: automationApi.configuration });

  const save = useMutation({
    mutationFn: async (input: { name: string; config: CampaignConfig }) => editing
      ? automationApi.update(editing.id, { ...input, version: editing.version })
      : automationApi.create(input),
    onSuccess: () => {
      setShowForm(false);
      setEditing(undefined);
      toast({ variant: "success", title: "Campaign saved", description: "Your campaign configuration is ready." });
      void queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });

  const action = useMutation({
    mutationFn: async (input: { type: "activate" | "pause" | "start"; campaign: Campaign }) => {
      if (input.type === "activate") return automationApi.activate(input.campaign.id);
      if (input.type === "pause") return automationApi.pause(input.campaign.id);
      return automationApi.start(input.campaign.id, requestKey("run"));
    },
    onSuccess: (_, input) => {
      toast({ variant: "success", title: input.type === "start" ? "Run queued" : `Campaign ${input.type}d`, description: input.type === "start" ? "The worker will process it shortly." : "The campaign status was updated." });
      void queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      void queryClient.invalidateQueries({ queryKey: ["automation-runs"] });
    },
  });

  function openCreate() {
    setEditing(undefined);
    setShowForm(true);
  }

  function openEdit(campaign: Campaign) {
    setEditing(campaign);
    setShowForm(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Automation</p>
          <h1 className="mt-1 text-3xl font-bold">Campaigns</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Define who to find, what you offer, and whether the agent should prepare drafts or send eligible messages automatically.</p>
        </div>
        {!showForm && <Button onClick={openCreate}>New campaign</Button>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Integration readiness</CardTitle>
          <CardDescription>Read-only checks from the backend. Configure missing services in Settings.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Readiness label="AI drafting" ready={configuration.data?.aiConfigured ?? false} value={configuration.data?.aiConfigured ? "NVIDIA model ready" : `${configuration.data?.aiProvider || "unknown"} fallback`} detail={configuration.data?.aiConfigured ? "Model-backed drafts enabled" : "Template output only"} />
          <Readiness label="Lead discovery" ready={configuration.data?.googleConfigured ?? false} value={configuration.data?.googleConfigured ? "Google Places ready" : "Not configured"} detail="Business discovery and place data" />
          <Readiness label="Contact lookup" ready={configuration.data?.hunterConfigured ?? false} value={configuration.data?.hunterConfigured ? "Hunter configured" : "Not configured"} detail="Contact enrichment and verification" />
          <Readiness label="Email sending" ready={configuration.data?.outboundConfigured ?? false} value={configuration.data?.outboundConfigured ? "Enabled" : "Disabled"} detail={configuration.data?.hunterMailboxConfigured ? "Hunter mailbox connected" : "Hunter mailbox setup required"} />
        </CardContent>
        {configuration.data?.outboundBlockers.length ? <div className="mx-6 mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <p className="font-medium">Sending is locked</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">{configuration.data.outboundBlockers.map(item => <li key={item}>{item}</li>)}</ul>
          <Link href="/settings#outreach-setup" className="mt-3 inline-block font-medium text-primary underline underline-offset-4">View cold email setup</Link>
        </div> : null}
      </Card>

      {showForm && <CampaignForm campaign={editing} aiReady={configuration.data?.aiConfigured ?? false} outboundReady={configuration.data?.outboundConfigured ?? false} onSave={async input => { await save.mutateAsync(input); }} onCancel={() => { setShowForm(false); setEditing(undefined); }} />}

      <Card>
        <CardHeader><CardTitle>Saved campaigns</CardTitle><CardDescription>{campaigns.data?.total ?? 0} campaign{campaigns.data?.total === 1 ? "" : "s"}</CardDescription></CardHeader>
        <CardContent>
          {campaigns.isLoading && <p className="text-sm text-muted-foreground">Loading campaigns…</p>}
          {!campaigns.isLoading && !campaigns.data?.items.length && <div className="rounded-lg border border-dashed p-6">
            <h3 className="font-semibold">Start with a draft-only campaign</h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Define a target, location, approved offer, and qualification rules. The agent will prepare work for review; it will not email anyone.</p>
            <ol className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
              <li><span className="font-medium text-foreground">1.</span> Configure AI and lead sources in Settings.</li>
              <li><span className="font-medium text-foreground">2.</span> Save a campaign in draft-only mode.</li>
              <li><span className="font-medium text-foreground">3.</span> Activate it, then start a manual run.</li>
            </ol>
            <Button className="mt-5" onClick={openCreate}>Create first campaign</Button>
          </div>}
          <div className="space-y-3">
            {campaigns.data?.items.map(campaign => <CampaignRow key={campaign.id} campaign={campaign} busy={action.isPending} onEdit={() => openEdit(campaign)} onAction={type => action.mutate({ type, campaign })} />)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Readiness({ label, ready, value, detail }: { label: string; ready: boolean; value: string; detail: string }) {
  return <div className="rounded-lg border p-3"><div className="flex items-center justify-between gap-2"><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><span className={`h-2.5 w-2.5 rounded-full ${ready ? "bg-emerald-500" : "bg-amber-500"}`} aria-label={ready ? "ready" : "not ready"} /></div><p className="mt-2 text-sm font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>;
}

function CampaignRow({ campaign, busy, onEdit, onAction }: { campaign: Campaign; busy: boolean; onEdit: () => void; onAction: (type: "activate" | "pause" | "start") => void }) {
  const autoSend = campaign.config.mode === "AUTO_SEND";
  return <div className="flex flex-col gap-4 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{campaign.name}</h3><StatusBadge status={campaign.status} /><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${autoSend ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700"}`}>{autoSend ? "AUTO SEND" : "DRAFT ONLY"}</span></div>
      <p className="mt-1 text-sm text-muted-foreground">{campaign.config.keyword} · {campaign.config.location} · {campaign.config.limit} businesses/run</p>
      <p className="mt-1 text-xs text-muted-foreground">{autoSend ? `Up to ${campaign.config.maxDailySends}/day · confidence ${campaign.config.minQualificationConfidence}` : "Requires review before sending"}{campaign.nextRunAt ? ` · next run ${new Date(campaign.nextRunAt).toLocaleString()}` : ""}</p>
    </div>
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={onEdit} disabled={busy || campaign.status === "ACTIVE"}>Edit</Button>
      {campaign.status === "ACTIVE" ? <Button size="sm" variant="outline" onClick={() => onAction("pause")} disabled={busy}>Pause</Button> : <Button size="sm" variant="outline" onClick={() => onAction("activate")} disabled={busy}>Activate</Button>}
      <Button size="sm" onClick={() => onAction("start")} disabled={busy || campaign.status !== "ACTIVE"}>Run now</Button>
    </div>
  </div>;
}
