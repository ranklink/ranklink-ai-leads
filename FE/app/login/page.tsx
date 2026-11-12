"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/services/api";

type Envelope<T> = { success: true; data: T };
type LoginResult = { required: boolean; user: { id: string; email: string; role: string } | null };

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const queryClient = useQueryClient();
  const router = useRouter();
  const status = useQuery({ queryKey: ["auth-status"], queryFn: () => apiRequest<Envelope<{ required: boolean }>>("/auth/status").then(result => result.data), retry: false });
  const login = useMutation({
    mutationFn: () => apiRequest<Envelope<LoginResult>>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }).then(result => result.data),
    onSuccess: async () => {
      setPassword("");
      await queryClient.invalidateQueries({ queryKey: ["auth-session"] });
      router.replace("/");
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    login.mutate();
  }

  return <div className="mx-auto max-w-md py-10">
    <Card>
      <CardHeader><CardTitle>Sign in to Leado</CardTitle><CardDescription>Use an account created for your workspace.</CardDescription></CardHeader>
      <CardContent>
        {status.data && !status.data.required ? <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">Sign-in is not required in local development. Set <code>AUTH_REQUIRED=true</code> on the backend to enable workspace accounts.</p> : <form onSubmit={submit} className="space-y-4">
          <label className="block space-y-1 text-sm">Email<input className="w-full rounded-md border bg-background px-3 py-2" type="email" autoComplete="username" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} /></label>
          <label className="block space-y-1 text-sm">Password<input className="w-full rounded-md border bg-background px-3 py-2" type="password" autoComplete="current-password" required maxLength={200} value={password} onChange={event => setPassword(event.target.value)} /></label>
          {login.isError && <p role="alert" className="text-sm text-destructive">{login.error instanceof Error ? login.error.message : "Unable to sign in."}</p>}
          <Button className="w-full" disabled={login.isPending || status.isLoading}>{login.isPending ? "Signing in…" : "Sign in"}</Button>
        </form>}
      </CardContent>
    </Card>
  </div>;
}
