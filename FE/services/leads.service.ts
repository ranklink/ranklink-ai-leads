import { API_URL, authenticatedFetch as fetch } from "./api";

export interface SearchLeadsPayload {
  keyword: string;
  location: string;
  radius?: number;
  limit?: number;
  minimumRating?: number;
  website?: "ANY" | "HAS_WEBSITE" | "NO_WEBSITE";
}

export async function searchLeads(payload: SearchLeadsPayload) {
  const res = await fetch(`${API_URL}/leads/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Search failed");
  return data;
}

export async function getLeads(params: Record<string, string | number | undefined>) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "" && v !== null) usp.set(k, String(v));
  });
  const res = await fetch(`${API_URL}/leads?${usp.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch leads");
  return data;
}

export async function getLeadById(id: string) {
  const res = await fetch(`${API_URL}/leads/${id}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Lead not found");
  return data;
}

export async function getEmailPreview(id: string, payload: { recipientEmail?: string; recipientName?: string }) {
  const res = await fetch(`${API_URL}/outreach/${id}/email-preview`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Unable to create email preview");
  return data;
}

export async function sendEmail(id: string, payload: { recipientEmail: string; recipientName?: string; subject: string; body: string }) {
  const res = await fetch(`${API_URL}/outreach/${id}/email-send`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Unable to send email");
  return data;
}

export function getExportUrl(params: Record<string, string | number | undefined>) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "" && v !== null) usp.set(k, String(v));
  });
  return `${API_URL}/leads/export?${usp.toString()}`;
}
