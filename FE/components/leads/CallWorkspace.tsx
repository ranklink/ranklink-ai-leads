"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { callsApi, type CallOutcome } from "@/services/calls.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const outcomeOptions: { value: CallOutcome; label: string }[] = [
  { value: "ANSWERED", label: "Answered" },
  { value: "NO_ANSWER", label: "No answer" },
  { value: "CALLBACK_REQUESTED", label: "Callback requested" },
  { value: "INTERESTED", label: "Interested" },
  { value: "NOT_INTERESTED", label: "Not interested (stop calls)" },
  { value: "WRONG_NUMBER", label: "Wrong number (stop calls)" },
  { value: "DO_NOT_CALL", label: "Do not call (stop calls)" },
];

export function CallWorkspace({ leadId }: { leadId: string }) {
  const queryClient = useQueryClient();
  const queryKey = ["lead-calling-profile", leadId];
  const query = useQuery({ queryKey, queryFn: () => callsApi.getProfile(leadId) });
  const [interestConfirmed, setInterestConfirmed] = useState(false);
  const [doNotCallChecked, setDoNotCallChecked] = useState(false);
  const [interestEvidence, setInterestEvidence] = useState("");
  const [timeZone, setTimeZone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || "");
  const [outcome, setOutcome] = useState<CallOutcome>("ANSWERED");
  const [notes, setNotes] = useState("");
  const [followUpAt, setFollowUpAt] = useState("");
  const [error, setError] = useState<string | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey });
  const saveProfile = useMutation({ mutationFn: (eligible: boolean) => callsApi.updateProfile(leadId, { eligible, interestConfirmed, interestEvidence, doNotCallChecked, timeZone }), onSuccess: () => { setError(null); void refresh(); }, onError: (err) => setError(err instanceof Error ? err.message : "Unable to save calling eligibility.") });
  const logCall = useMutation({ mutationFn: (payload: { outcome: CallOutcome; notes?: string; followUpAt?: string }) => callsApi.logActivity(leadId, payload), onSuccess: () => { setError(null); setNotes(""); setFollowUpAt(""); void refresh(); }, onError: (err) => setError(err instanceof Error ? err.message : "Unable to save call activity.") });

  async function beginCall() {
    setError(null);
    try {
      await callsApi.logActivity(leadId, { outcome: "STARTED" });
      if (query.data?.phoneNumber) window.location.href = `tel:${query.data.phoneNumber.replace(/[^\d+]/g, "")}`;
      void refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start the call.");
    }
  }

  function submitOutcome(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    logCall.mutate({ outcome, notes: notes.trim() || undefined, followUpAt: outcome === "CALLBACK_REQUESTED" && followUpAt ? new Date(followUpAt).toISOString() : undefined });
  }

  if (query.isLoading) return <Card><CardContent className="p-5 text-sm text-muted-foreground">Loading call readiness…</CardContent></Card>;
  if (query.isError || !query.data) return <Card><CardContent className="p-5 text-sm text-destructive">Could not load call readiness. Refresh and try again.</CardContent></Card>;
  const data = query.data;

  return <Card>
    <CardHeader><CardTitle>Calling</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm text-muted-foreground">Calls are placed by you from your device. The app records readiness and outcomes; it does not dial automatically.</p>
      {!data.canCall && <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm"><p className="font-medium">Calling is blocked until checks are complete.</p><ul className="mt-1 list-disc pl-5">{data.blockers.map(blocker => <li key={blocker}>{blocker}</li>)}</ul></div>}
      <form className="space-y-3 rounded-md border p-4" onSubmit={event => { event.preventDefault(); saveProfile.mutate(interestConfirmed && doNotCallChecked && Boolean(interestEvidence.trim())); }}>
        <p className="text-sm font-medium">Eligibility check</p>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={interestConfirmed} onChange={event => setInterestConfirmed(event.target.checked)} /><span>I confirmed this contact has requested or agreed to receive a call.</span></label>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={doNotCallChecked} onChange={event => setDoNotCallChecked(event.target.checked)} /><span>I checked the applicable do-not-call registry for this number.</span></label>
        <textarea value={interestEvidence} onChange={event => setInterestEvidence(event.target.value)} maxLength={1000} required placeholder="Record the source and date of the contact’s interest" className="min-h-20 w-full rounded-md border bg-background p-2 text-sm" />
        <input value={timeZone} onChange={event => setTimeZone(event.target.value)} maxLength={100} placeholder="Contact time zone, e.g. Asia/Dubai" className="w-full rounded-md border bg-background p-2 text-sm" />
        <Button type="submit" disabled={saveProfile.isPending || !interestConfirmed || !doNotCallChecked || !interestEvidence.trim()}>{saveProfile.isPending ? "Saving…" : "Confirm eligible to call"}</Button>
      </form>
      {data.canCall && <div className="flex flex-wrap items-center gap-3"><Button onClick={beginCall} disabled={logCall.isPending}>{logCall.isPending ? "Preparing…" : `Call ${data.phoneNumber}`}</Button><span className="text-xs text-muted-foreground">Opens your device’s phone app.</span></div>}
      {data.canCall && <form onSubmit={submitOutcome} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]"><select value={outcome} onChange={event => setOutcome(event.target.value as CallOutcome)} className="rounded-md border bg-background p-2 text-sm">{outcomeOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select><input value={notes} onChange={event => setNotes(event.target.value)} maxLength={1000} placeholder="Call notes or callback details" className="rounded-md border bg-background p-2 text-sm" />{outcome === "CALLBACK_REQUESTED" && <input type="datetime-local" value={followUpAt} onChange={event => setFollowUpAt(event.target.value)} className="rounded-md border bg-background p-2 text-sm" />}<Button type="submit" variant="outline" disabled={logCall.isPending}>Save outcome</Button></form>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {data.activities.length > 0 && <div className="space-y-2"><h4 className="text-sm font-semibold">Recent call activity</h4>{data.activities.map(activity => <div key={activity.id} className="flex flex-wrap justify-between gap-2 border-t pt-2 text-sm"><span>{activity.outcome.replaceAll("_", " ")}{activity.notes ? ` — ${activity.notes}` : ""}</span><time className="text-xs text-muted-foreground">{new Date(activity.createdAt).toLocaleString()}</time></div>)}</div>}
    </CardContent>
  </Card>;
}
