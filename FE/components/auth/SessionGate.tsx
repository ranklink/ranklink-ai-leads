"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { API_URL } from "@/services/api";

export function SessionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/login";
  const [status, setStatus] = useState<"checking" | "authenticated" | "unavailable">("checking");

  useEffect(() => {
    if (isLoginPage) return;
    let cancelled = false;
    fetch(`${API_URL}/auth/me`, { credentials: "include" })
      .then(response => {
        if (response.status === 401) {
          const next = encodeURIComponent(pathname || "/");
          router.replace(`/login?next=${next}`);
          return;
        }
        if (!response.ok) throw new Error("Session could not be verified.");
        if (!cancelled) setStatus("authenticated");
      })
      .catch(() => {
        if (!cancelled) setStatus("unavailable");
      });
    return () => { cancelled = true; };
  }, [isLoginPage, pathname, router]);

  if (isLoginPage) return <>{children}</>;
  if (status === "checking") return <p role="status" className="mx-auto max-w-7xl px-4 py-10 text-sm text-muted-foreground">Checking your session…</p>;
  if (status === "unavailable") return <p role="alert" className="mx-auto max-w-7xl px-4 py-10 text-sm text-destructive">Could not connect to the API. Please refresh or try again shortly.</p>;
  return <>{children}</>;
}
