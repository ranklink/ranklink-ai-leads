"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, type TelegramLinkCode, type TelegramStatus } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ApiResult<T> = { success: boolean; data: T };

export default function SettingsPage() {
  const queryClient = useQueryClient();
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
