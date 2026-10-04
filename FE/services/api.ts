const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");
const apiRoot = configuredApiUrl || "http://localhost:5000";
export const API_URL = apiRoot.endsWith("/api/v1") ? apiRoot : `${apiRoot}/api/v1`;

export async function authenticatedFetch(input: RequestInfo | URL, options?: RequestInit): Promise<Response> {
  // Auth disabled — no session redirect; keep credentials for compatibility
  try {
    const response = await fetch(input, { ...options, credentials: "include" });
    if (!response.ok && typeof window !== "undefined") {
      const body = await response.clone().json().catch(() => ({}));
      window.dispatchEvent(new CustomEvent("app:toast", { detail: { variant: "error", title: "Request failed", description: body.message || `Request failed with status ${response.status}.` } }));
    }
    return response;
  } catch (error) {
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("app:toast", { detail: { variant: "error", title: "Connection failed", description: error instanceof Error ? error.message : "Unable to reach the backend." } }));
    throw error;
  }
}

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await authenticatedFetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || "API request failed");
  }

  return response.json();
}

export interface TelegramStatus {
  configured: boolean;
  botUsername: string | null;
  connected: boolean;
  connection: { username: string | null; connectedAt: string } | null;
}

export interface TelegramLinkCode {
  code: string;
  expiresAt: string;
  botUsername: string | null;
}
