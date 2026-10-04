"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastInput {
  title?: string;
  description: string;
  variant?: ToastVariant;
  duration?: number;
}

interface Toast extends ToastInput {
  id: string;
}

interface ToastContextValue {
  toast: (input: ToastInput) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastSequence = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(current => current.filter(item => item.id !== id));
  }, []);

  const toast = useCallback((input: ToastInput) => {
    const id = `toast-${Date.now()}-${toastSequence++}`;
    setToasts(current => [...current, { ...input, id, variant: input.variant ?? "info" }].slice(-5));
    return id;
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  useEffect(() => {
    const handleToastEvent = (event: Event) => {
      const input = (event as CustomEvent<ToastInput>).detail;
      if (input?.description) toast(input);
    };
    window.addEventListener("app:toast", handleToastEvent);
    return () => window.removeEventListener("app:toast", handleToastEvent);
  }, [toast]);

  return <ToastContext.Provider value={value}>
    {children}
    <div className="pointer-events-none fixed inset-x-4 top-4 z-50 flex flex-col items-end gap-3 sm:left-auto sm:right-4 sm:max-w-md" role="region" aria-label="Notifications" aria-live="polite">
      {toasts.map(item => <ToastItem key={item.id} item={item} onDismiss={dismiss} />)}
    </div>
  </ToastContext.Provider>;
}

function ToastItem({ item, onDismiss }: { item: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(item.id), item.duration ?? 5000);
    return () => window.clearTimeout(timer);
  }, [item.duration, item.id, onDismiss]);

  const styles: Record<ToastVariant, string> = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-950",
    error: "border-red-200 bg-red-50 text-red-950",
    warning: "border-amber-200 bg-amber-50 text-amber-950",
    info: "border-sky-200 bg-sky-50 text-sky-950",
  };

  return <div className={cn("pointer-events-auto w-full rounded-lg border p-4 shadow-lg", styles[item.variant ?? "info"])} role={item.variant === "error" ? "alert" : "status"}>
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{item.title ?? titleFor(item.variant ?? "info")}</p><p className="mt-1 text-sm opacity-90">{item.description}</p></div>
      <button type="button" className="rounded p-1 text-lg leading-none opacity-60 hover:opacity-100" onClick={() => onDismiss(item.id)} aria-label="Dismiss notification">×</button>
    </div>
  </div>;
}

function titleFor(variant: ToastVariant) {
  return variant === "success" ? "Success" : variant === "error" ? "Error" : variant === "warning" ? "Warning" : "Notice";
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
