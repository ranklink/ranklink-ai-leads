import { apiRequest } from "@/services/api";
import type { AgentJobDetail, LeadAgentSummary, QueuedAgentJob } from "@/types/agent";

interface ApiEnvelope<T> {
  success: true;
  data: T;
}

async function get<T>(path: string): Promise<T> {
  return (await apiRequest<ApiEnvelope<T>>(path)).data;
}

async function post<T>(path: string, body: unknown, idempotencyKey?: string): Promise<T> {
  const headers = idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined;
  return (await apiRequest<ApiEnvelope<T>>(path, { method: "POST", headers, body: JSON.stringify(body) })).data;
}

export const agentApi = {
  leadSummary: (leadId: string) => get<LeadAgentSummary>(`/leads/${encodeURIComponent(leadId)}/agent-summary`),
  job: (jobId: string) => get<AgentJobDetail>(`/agent-jobs/${encodeURIComponent(jobId)}`),
  retryJob: (jobId: string) => post<QueuedAgentJob>(`/agent-jobs/${encodeURIComponent(jobId)}/retry`, {}),
  queueResearch: (leadId: string, campaignId: string, idempotencyKey: string) => post<QueuedAgentJob>(
    `/leads/${encodeURIComponent(leadId)}/agents/research`,
    { campaignId },
    idempotencyKey,
  ),
  queueAnalytics: (input: { campaignId: string | null; periodStart: string; periodEnd: string }, idempotencyKey: string) => post<QueuedAgentJob>(
    "/analytics/agent-jobs",
    input,
    idempotencyKey,
  ),
  updateDraft: async (id: string, input: { version: number; subject: string; body: string; recipientEmail: string; recipientName: string | null }) =>
    (await apiRequest<ApiEnvelope<unknown>>(`/agent-drafts/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) })).data,
  reviewDraft: (id: string, input: { version: number; decision: "APPROVED" | "REJECTED"; note?: string }) => post<unknown>(
    `/agent-drafts/${encodeURIComponent(id)}/review`, input,
  ),
  reviewFollowUp: (id: string, input: { version: number; decision: "APPROVED" | "CANCELLED" }) => post<unknown>(
    `/follow-up-plans/${encodeURIComponent(id)}/review`, input,
  ),
  sendDraft: (id: string, idempotencyKey: string) => post<unknown>(
    `/agent-drafts/${encodeURIComponent(id)}/send`, {}, idempotencyKey,
  ),
};

export function createIdempotencyKey(prefix: string): string {
  return `${prefix}:${crypto.randomUUID()}`;
}
