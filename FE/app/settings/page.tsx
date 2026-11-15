"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, type TelegramLinkCode, type TelegramStatus } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { automationApi } from "@/services/automation.service";

type ApiResult<T> = { success: boolean; data: T };

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [nvidiaApiKey, setNvidiaApiKey] = useState("");
  const [providerKeyNotice, setProviderKeyNotice] = useState<string | null>(null);
  const outreach = useQuery({ queryKey: ["automation-configuration"], queryFn: automationApi.configuration });
  const providerKeyStatus = useQuery({ queryKey: ["nvidia-key-status"], queryFn: () => apiRequest<ApiResult<{ configured: boolean; provider: string; model: string }>>("/settings/ai-provider").then(result => result.data), enabled: process.env.NODE_ENV !== "production", retry: false });
  const saveNvidiaKey = useMutation({
    mutationFn: () => apiRequest<ApiResult<{ configured: boolean; provider: string; restartRequired: boolean }>>("/settings/ai-provider/nvidia", { method: "PUT", body: JSON.stringify({ apiKey: nvidiaApiKey }) }),
    onSuccess: async () => { setNvidiaApiKey(""); setProviderKeyNotice("Key saved to the backend environment. Restart the backend and worker to enable NVIDIA agents."); await queryClient.invalidateQueries({ queryKey: ["nvidia-key-status"] }); },
  });
  const authStatus = useQuery({ queryKey: ["auth-status"], queryFn: () => apiRequest<ApiResult<{ required: boolean }>>("/auth/status").then(result => result.data) });
  const authSession = useQuery({ queryKey: ["auth-session"], queryFn: () => apiRequest<ApiResult<{ user: { email: string; role: string } | null }>>("/auth/me").then(result => result.data), enabled: authStatus.data?.required ?? false, retry: false });
  const signOut = useMutation({ mutationFn: () => apiRequest("/auth/logout", { method: "POST" }), onSuccess: async () => { await queryClient.clear(); router.replace("/login"); } });
  const telegram = useQuery({ queryKey: ["telegram-status"], queryFn: () => apiRequest<ApiResult<TelegramStatus>>("/telegram/status").then((r) => r.data) });
  const linkCode = useMutation({
    mutationFn: () => apiRequest<ApiResult<TelegramLinkCode>>("/telegram/link-code", { method: "POST" }).then((r) => r.data),
  });
  const disconnect = useMutation({
    mutationFn: () => apiRequest("/telegram/connection", { method: "DELETE" }),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["telegram-status"] }); linkCode.reset(); },
  });
  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Card>
        <CardHeader><CardTitle>Workspace access</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>{authStatus.data?.required ? `Sign-in is required${authSession.data?.user ? ` for ${authSession.data.user.email} (${authSession.data.user.role})` : ""}.` : "Local development is using the shared anonymous workspace."}</p>
          {authStatus.data?.required ? <Button variant="outline" onClick={() => signOut.mutate()} disabled={signOut.isPending}>{signOut.isPending ? "Signing out…" : "Sign out"}</Button> : <div className="space-y-2 text-muted-foreground"><p>To enable separate user sessions, set <code>AUTH_REQUIRED=true</code> in <code>BE/.env</code>, restart the backend, then create accounts with <code>npm run auth:create-user</code>. The command requires an explicit organization ID or a new workspace name; public signup is disabled.</p><p>Each account is scoped to its assigned organization. Use a separate workspace when a user should not see existing lead records.</p></div>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Telegram assistant</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Connect Telegram to request local business searches and receive ranked leads. Searching saves results to your account. The bot does not send outreach.</p>
          {telegram.isLoading && <p className="text-sm text-muted-foreground">Checking Telegram connection…</p>}
          {telegram.isError && <p className="text-sm text-destructive">Could not load Telegram status. Refresh this page to try again.</p>}
          {telegram.data && !telegram.data.configured && <p className="rounded-md bg-muted p-3 text-sm">Telegram bot setup is incomplete. Add the server configuration from the setup guide, then restart the backend and worker.</p>}
          {telegram.data?.connected && <div className="rounded-md border p-3 text-sm"><p className="font-medium">Connected{telegram.data.connection?.username ? ` as @${telegram.data.connection.username}` : ""}</p><p className="text-muted-foreground">Since {new Date(telegram.data.connection!.connectedAt).toLocaleString()}</p></div>}
          {telegram.data?.configured && !telegram.data.connected && <p className="text-sm text-muted-foreground">No Telegram chat is connected yet.</p>}
          {telegram.data?.configured && !telegram.data.connected && <Button onClick={() => linkCode.mutate()} disabled={linkCode.isPending}>{linkCode.isPending ? "Generating code…" : "Connect Telegram"}</Button>}
          {linkCode.data && <div className="space-y-2 rounded-md border p-4">
            <p className="text-sm">Open {linkCode.data.botUsername ? <a className="text-primary underline" href={`https://t.me/${linkCode.data.botUsername}`} target="_blank" rel="noreferrer">@{linkCode.data.botUsername}</a> : "your Telegram bot"} and send this one-time command:</p>
            <code className="block break-all rounded bg-muted p-3 text-sm">/link {linkCode.data.code}</code>
            <p className="text-xs text-muted-foreground">Expires {new Date(linkCode.data.expiresAt).toLocaleTimeString()}. Treat this code like a password.</p>
          </div>}
          {linkCode.isError && <p className="text-sm text-destructive">Could not create a link code. Confirm the bot settings on the backend and retry.</p>}
          {telegram.data?.connected && <Button variant="outline" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>{disconnect.isPending ? "Disconnecting…" : "Disconnect Telegram"}</Button>}
          {disconnect.isError && <p className="text-sm text-destructive">Could not disconnect Telegram. Please retry.</p>}
          <div className="border-t pt-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Commands</p>
            <p className="mt-1"><code>/find dentists | Pune</code> searches for local businesses.</p>
            <p><code>/help</code> shows the bot commands.</p>
          </div>
        </CardContent>
      </Card>
      <section id="outreach-setup" className="scroll-mt-24">
        <Card>
          <CardHeader><CardTitle>AI cold email setup</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">Leado drafts messages with NVIDIA and sends approved drafts through a connected Hunter mailbox. Provider secrets stay in the backend environment and are never shown here.</p>
            {process.env.NODE_ENV !== "production" && <form className="space-y-2 rounded-md border p-4" onSubmit={event => { event.preventDefault(); setProviderKeyNotice(null); saveNvidiaKey.mutate(); }}>
              <label htmlFor="nvidia-api-key" className="block font-medium">NVIDIA API key</label>
              <p className="text-xs text-muted-foreground">Saved only on the backend in <code>BE/.env</code>. The key is never returned to this page.</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input id="nvidia-api-key" type="password" autoComplete="new-password" value={nvidiaApiKey} onChange={event => setNvidiaApiKey(event.target.value)} minLength={20} maxLength={500} required placeholder={providerKeyStatus.data?.configured ? "Key is saved; enter a new key to replace it" : "Paste NVIDIA API key"} className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm" />
                <Button type="submit" disabled={saveNvidiaKey.isPending || nvidiaApiKey.trim().length < 20}>{saveNvidiaKey.isPending ? "Saving key…" : "Save key"}</Button>
              </div>
              {providerKeyStatus.data?.configured && <p className="text-xs text-emerald-700 dark:text-emerald-300">An NVIDIA key is configured. The key value is hidden.</p>}
              {providerKeyNotice && <p role="status" className="text-xs text-emerald-700 dark:text-emerald-300">{providerKeyNotice}</p>}
              {saveNvidiaKey.isError && <p role="alert" className="text-xs text-destructive">{saveNvidiaKey.error instanceof Error ? saveNvidiaKey.error.message : "Could not save the key."}</p>}
            </form>}
            <div className="grid gap-2 sm:grid-cols-2">
              <SetupStatus label="Model-backed AI" ready={outreach.data?.aiConfigured ?? false} value={outreach.data?.aiConfigured ? "Ready" : `Using ${outreach.data?.aiProvider ?? "unknown"} fallback`} />
              <SetupStatus label="Hunter contact lookup" ready={outreach.data?.hunterConfigured ?? false} value={outreach.data?.hunterConfigured ? "Configured" : "Needs HUNTER_API_KEY"} />
              <SetupStatus label="Hunter sending mailbox" ready={outreach.data?.hunterMailboxConfigured ?? false} value={outreach.data?.hunterMailboxConfigured ? "Account configured" : "Connect mailbox and set account ID"} />
              <SetupStatus label="Sending enabled" ready={outreach.data?.outboundConfigured ?? false} value={outreach.data?.outboundConfigured ? "Enabled" : "Disabled"} />
            </div>
            <ol className="list-decimal space-y-2 pl-5">
              <li>Save your NVIDIA API key above, then restart the backend and worker to enable AI-written drafts.</li>
              <li>Connect and verify a business mailbox in Hunter, then set <code>HUNTER_API_KEY</code> and <code>HUNTER_EMAIL_ACCOUNT_ID</code>.</li>
              <li>Keep <code>OUTREACH_ENABLED=false</code> while testing. Create a <strong>Drafts for review</strong> campaign and review each generated message.</li>
              <li>Only after mailbox/domain authentication and your sending policy are ready, set <code>OUTREACH_ENABLED=true</code> and restart the backend and worker. Auto-send also requires NVIDIA and a verified contact.</li>
            </ol>
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3">The current sender uses Hunter’s connected mailbox; this app does not have a generic SMTP/Gmail sender. No message is sent by setting up AI alone.</p>
          </CardContent>
        </Card>
      </section>
      <div className="border rounded-xl p-6 space-y-3">
        <h3 className="font-semibold">API Configuration</h3>
        <p className="text-sm text-muted-foreground">Frontend connects to Express API via NEXT_PUBLIC_API_URL.</p>
        <code className="block bg-muted p-3 rounded text-xs">NEXT_PUBLIC_API_URL={process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"}</code>
        <p className="text-xs text-muted-foreground">Google Places API key is stored only in backend/.env and never exposed to the frontend.</p>
      </div>
      <div className="border rounded-xl p-6 space-y-2">
        <h3 className="font-semibold">Architecture</h3>
        <p className="text-sm text-muted-foreground">Next.js (UI) → Express.js (validation, Places, scoring, MySQL via Prisma) → Google Places API (New) — Text Search + Place Details with controlled concurrency (5).</p>
      </div>
    </div>
  );
}

function SetupStatus({ label, ready, value }: { label: string; ready: boolean; value: string }) {
  return <div className="rounded-md border p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 font-medium">{value}</p><span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs ${ready ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-800 dark:text-amber-300"}`}>{ready ? "Ready" : "Needs setup"}</span></div>;
}
