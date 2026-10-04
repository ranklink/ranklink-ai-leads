import { env } from "../config/env";
import { ApiError } from "../utils/api-error";

interface HunterResponse<T> { data?: T; errors?: Array<{ details?: string }> }

async function hunterRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!env.HUNTER_API_KEY) throw new ApiError(503, "Hunter is not configured. Add HUNTER_API_KEY to the backend environment.");
  const response = await fetch(`${env.HUNTER_API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "X-API-KEY": env.HUNTER_API_KEY, ...(init?.headers || {}) },
  });
  const payload = await response.json().catch(() => ({})) as HunterResponse<T>;
  if (!response.ok) throw new ApiError(response.status >= 500 ? 502 : response.status, payload.errors?.[0]?.details || "Hunter request failed");
  return payload.data as T;
}

export async function verifyEmail(email: string) {
  return hunterRequest<{ status: string; score?: number }>(`/email-verifier?email=${encodeURIComponent(email)}`);
}

export async function findContacts(domain: string, limit = 10) {
  const result = await hunterRequest<{ emails?: Array<{ value?: string; first_name?: string; last_name?: string; position?: string; confidence?: number; verification?: { status?: string } }> }>(
    `/domain-search?domain=${encodeURIComponent(domain)}&limit=${Math.min(10, Math.max(1, limit))}`,
  );
  return (result.emails ?? []).flatMap(candidate => {
    if (!candidate.value) return [];
    const name = [candidate.first_name, candidate.last_name].filter(Boolean).join(" ") || null;
    return [{ name, email: candidate.value.toLowerCase(), role: candidate.position ?? null, confidence: Math.max(0, Math.min(1, (candidate.confidence ?? 0) / 100)), verificationStatus: candidate.verification?.status ?? null }];
  });
}

export async function sendEmail(input: { to: string; subject: string; body: string; idempotencyKey: string }) {
  if (!env.HUNTER_EMAIL_ACCOUNT_ID) throw new ApiError(503, "Hunter sending is not configured. Add HUNTER_EMAIL_ACCOUNT_ID after connecting a mailbox in Hunter.");
  return hunterRequest(`/messages`, {
    method: "POST",
    headers: { "Idempotency-Key": input.idempotencyKey },
    body: JSON.stringify({ email_account_id: Number(env.HUNTER_EMAIL_ACCOUNT_ID), to: input.to, subject: input.subject, body: input.body, message_format: "text" }),
  });
}
