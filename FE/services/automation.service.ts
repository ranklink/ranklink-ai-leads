import { apiRequest } from "./api";
import type { Campaign, CampaignConfig, Page, RunSummary, RunDetail } from "@/types/automation";
type Envelope<T> = { success: true; data: T };
async function get<T>(path: string): Promise<T> { return (await apiRequest<Envelope<T>>(path)).data; }
async function post<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<T> { return (await apiRequest<Envelope<T>>(path, { method: "POST", headers, body: JSON.stringify(body ?? {}) })).data; }
export const automationApi = {
  configuration: () => get<{ modes: string[]; aiProvider: string; aiConfigured: boolean; googleConfigured: boolean; outboundConfigured: boolean }>("/automation/configuration"),
  campaigns: (page = 1) => get<Page<Campaign>>(`/campaigns?page=${page}`),
  campaign: (id: string) => get<Campaign>(`/campaigns/${id}`),
  create: (input: { name: string; config: CampaignConfig }) => post<Campaign>("/campaigns", input),
  update: async (id: string, input: { name: string; config: CampaignConfig; version: number }) => (await apiRequest<Envelope<Campaign>>(`/campaigns/${id}`, { method: "PATCH", body: JSON.stringify(input) })).data,
  activate: (id: string) => post<Campaign>(`/campaigns/${id}/activate`),
  pause: (id: string) => post<Campaign>(`/campaigns/${id}/pause`),
  start: (id: string, key: string) => post<{ id: string }>(`/campaigns/${id}/runs`, undefined, { "Idempotency-Key": key }),
  runs: (page = 1, campaignId?: string) => get<Page<RunSummary>>(`/automation/runs?page=${page}${campaignId ? `&campaignId=${encodeURIComponent(campaignId)}` : ""}`),
  run: (id: string) => get<RunDetail>(`/automation/runs/${id}`),
  cancel: (id: string) => post(`/automation/runs/${id}/cancel`),
  retry: (id: string) => post(`/automation/runs/${id}/retry`),
  review: (id: string, version: number, decision: "APPROVED" | "REJECTED", recipientEmail?: string, recipientName?: string) => post(`/assessments/${id}/review`, { version, decision, recipientEmail: recipientEmail || null, recipientName: recipientName || null }),
  editDraft: (id: string, version: number, subject: string, body: string, recipientEmail: string, recipientName?: string) => apiRequest(`/agent-drafts/${id}`, { method: "PATCH", body: JSON.stringify({ version, subject, body, recipientEmail, recipientName: recipientName || null }) }),
  reviewAgentDraft: (id: string, version: number, decision: "APPROVED" | "REJECTED", note?: string) => post(`/agent-drafts/${id}/review`, { version, decision, note }),
  sendAgentDraft: (id: string, key: string) => post(`/agent-drafts/${id}/send`, undefined, { "Idempotency-Key": key }),
};
