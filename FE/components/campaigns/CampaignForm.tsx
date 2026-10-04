"use client";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import type { Campaign, CampaignConfig } from "@/types/automation";

const initial: CampaignConfig = { keyword: "", location: "", offer: "", senderName: "", qualificationCriteria: "", limit: 10, minimumScore: 50, website: "ANY", intervalHours: null, maxAiCalls: 40, maxGoogleCalls: 22, mode: "DRAFT_ONLY", maxDailySends: 20, minQualificationConfidence: 0.8, minContactConfidence: 0.8, requireVerifiedContact: true, followUpEnabled: false };
export function CampaignForm({ campaign, onSave, onCancel }: { campaign?: Campaign; onSave: (input: { name: string; config: CampaignConfig }) => Promise<void>; onCancel: () => void }) {
  const [name, setName] = useState(campaign?.name ?? "");
  const [config, setConfig] = useState<CampaignConfig>({ ...initial, ...(campaign?.config ?? {}) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function field<K extends keyof CampaignConfig>(key: K, value: CampaignConfig[K]) { setConfig(previous => ({ ...previous, [key]: value })); }
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { await onSave({ name, config }); }
    catch (error) { setError(error instanceof Error ? error.message : "Unable to save campaign"); }
    finally { setBusy(false); }
  }
  const inputClass = "w-full rounded-md border bg-background px-3 py-2 text-sm";
  return <form onSubmit={submit} className="space-y-6 rounded-xl border bg-card p-6">
    <div><h2 className="text-xl font-semibold">{campaign ? "Edit campaign" : "Define your campaign"}</h2><p className="mt-1 text-sm text-muted-foreground">Give the agent a clear offer and qualification criteria. Every result will be available for review.</p></div>
    <div className="grid gap-4 md:grid-cols-2">
      <label className="space-y-1 text-sm">Campaign name<input className={inputClass} required minLength={2} maxLength={120} value={name} onChange={event => setName(event.target.value)} /></label>
      <label className="space-y-1 text-sm">Your name<input className={inputClass} required minLength={2} maxLength={100} value={config.senderName} onChange={event => field("senderName", event.target.value)} /></label>
      <label className="space-y-1 text-sm">Business type<input className={inputClass} required minLength={2} maxLength={100} placeholder="e.g. dental clinics" value={config.keyword} onChange={event => field("keyword", event.target.value)} /></label>
      <label className="space-y-1 text-sm">Target location<input className={inputClass} required minLength={2} maxLength={200} placeholder="e.g. Pune, India" value={config.location} onChange={event => field("location", event.target.value)} /></label>
      <label className="space-y-1 text-sm md:col-span-2">Your offer and approved claims<textarea className={`${inputClass} min-h-28`} required minLength={10} maxLength={2000} placeholder="Describe what you actually sell. Include only claims and terms you approve." value={config.offer} onChange={event => field("offer", event.target.value)} /></label>
      <label className="space-y-1 text-sm md:col-span-2">What makes a good lead?<textarea className={`${inputClass} min-h-24`} required minLength={10} maxLength={2000} placeholder="Describe fit, exclusions, and evidence the agent should look for." value={config.qualificationCriteria} onChange={event => field("qualificationCriteria", event.target.value)} /></label>
      <label className="space-y-1 text-sm">Businesses per run<input type="number" className={inputClass} required min={1} max={20} value={config.limit} onChange={event => field("limit", Number(event.target.value))} /></label>
      <label className="space-y-1 text-sm">Minimum heuristic score<input type="number" className={inputClass} required min={0} max={100} value={config.minimumScore} onChange={event => field("minimumScore", Number(event.target.value))} /></label>
      <label className="space-y-1 text-sm">Website filter<select className={inputClass} value={config.website} onChange={event => field("website", event.target.value as CampaignConfig["website"])}><option value="ANY">Any website status</option><option value="HAS_WEBSITE">Website listed</option><option value="NO_WEBSITE">No website listed</option></select></label>
      <label className="space-y-1 text-sm">Run schedule<select className={inputClass} value={config.intervalHours ?? "manual"} onChange={event => field("intervalHours", event.target.value === "manual" ? null : Number(event.target.value))}><option value="manual">Start manually</option><option value="24">Every 24 hours</option><option value="168">Every 7 days</option></select></label>
      <label className="space-y-1 text-sm">Maximum AI requests per run<input type="number" className={inputClass} required min={1} max={80} value={config.maxAiCalls} onChange={event => field("maxAiCalls", Number(event.target.value))} /></label>
      <label className="space-y-1 text-sm">Maximum Google requests per run<input type="number" className={inputClass} required min={1} max={30} value={config.maxGoogleCalls} onChange={event => field("maxGoogleCalls", Number(event.target.value))} /></label>
      <label className="space-y-1 text-sm">Campaign mode<select className={inputClass} value={config.mode} onChange={event => field("mode", event.target.value as CampaignConfig["mode"])}><option value="DRAFT_ONLY">Drafts for review</option><option value="AUTO_SEND">Automatically send approved matches</option></select></label>
      <label className="space-y-1 text-sm">Maximum sends per day<input type="number" className={inputClass} required min={1} max={500} value={config.maxDailySends} onChange={event => field("maxDailySends", Number(event.target.value))} /></label>
      <label className="space-y-1 text-sm">Minimum qualification confidence<input type="number" className={inputClass} required min={0} max={1} step={0.05} value={config.minQualificationConfidence} onChange={event => field("minQualificationConfidence", Number(event.target.value))} /></label>
      <label className="space-y-1 text-sm">Minimum contact confidence<input type="number" className={inputClass} required min={0} max={1} step={0.05} value={config.minContactConfidence} onChange={event => field("minContactConfidence", Number(event.target.value))} /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={config.requireVerifiedContact} onChange={event => field("requireVerifiedContact", event.target.checked)} />Require Hunter-verified contacts</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={config.followUpEnabled} onChange={event => field("followUpEnabled", event.target.checked)} />Enable one automated follow-up</label>
    </div>
    <p className="text-sm text-muted-foreground">Draft-only campaigns never send. Auto-send requires outbound sending to be enabled on the backend, a verified contact, and the configured daily limit. Recurring runs begin after activation.</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="flex gap-3"><Button disabled={busy}>{busy ? "Saving…" : "Save campaign"}</Button><Button type="button" variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button></div>
  </form>;
}
