"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const client = useQueryClient();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const values = new FormData(event.currentTarget);
    try {
      await apiRequest("/auth/login", { method: "POST", body: JSON.stringify({ email: values.get("email"), password: values.get("password") }) });
      client.clear(); router.replace("/campaigns");
    } catch (error) { setError(error instanceof Error ? error.message : "Sign in failed"); }
    finally { setBusy(false); }
  }
  return <div className="mx-auto max-w-md py-16"><p className="text-sm font-semibold text-primary">LOCALLEADS AUTOMATION</p><h1 className="mt-3 text-3xl font-bold">Sign in to your workspace</h1><p className="mt-3 text-muted-foreground">Manage campaigns, review agent decisions, and keep your lead research in one place.</p><form onSubmit={submit} className="mt-8 space-y-5 rounded-xl border bg-card p-6"><label className="block space-y-2"><span>Email</span><input name="email" type="email" autoComplete="username" required maxLength={254} className="w-full rounded-md border bg-background p-3" /></label><label className="block space-y-2"><span>Password</span><input name="password" type="password" autoComplete="current-password" required maxLength={256} className="w-full rounded-md border bg-background p-3" /></label>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<Button className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button></form></div>;
}
