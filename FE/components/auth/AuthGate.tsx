"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";

type Envelope<T> = { success: true; data: T };
type AuthStatus = { required: boolean };
type AuthMe = { required: boolean; user: { id: string; email: string; organizationId: string; role: string } | null };

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const status = useQuery({ queryKey: ["auth-status"], queryFn: () => apiRequest<Envelope<AuthStatus>>("/auth/status").then(result => result.data), retry: false });
  const authRequired = status.data?.required ?? false;
  const isLoginPage = pathname === "/login";
  const session = useQuery({ queryKey: ["auth-session"], queryFn: () => apiRequest<Envelope<AuthMe>>("/auth/me").then(result => result.data), enabled: authRequired, retry: false });

  useEffect(() => {
    if (authRequired && !isLoginPage && session.isError) router.replace("/login");
    if (authRequired && isLoginPage && session.data?.user) router.replace("/");
  }, [authRequired, isLoginPage, router, session.data?.user, session.isError]);

  if (status.isLoading) return <p className="mx-auto max-w-xl p-8 text-sm text-muted-foreground">Loading workspace…</p>;
  if (status.isError) return <p role="alert" className="mx-auto max-w-xl p-8 text-sm text-destructive">The API is unavailable. Check the backend and refresh.</p>;
  if (authRequired && !isLoginPage && (!session.data?.user || session.isLoading || session.isError)) return <p className="mx-auto max-w-xl p-8 text-sm text-muted-foreground">Redirecting to sign in…</p>;
  return <>{children}</>;
}
