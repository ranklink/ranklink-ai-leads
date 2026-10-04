import { API_URL, authenticatedFetch as fetch } from "./api";

export interface NicheSuggestion {
  niche: string;
  category: string;
  competition: "LOW" | "MEDIUM" | "HIGH";
  competitionScore: number;
  opportunityScore: number;
  metrics: {
    count: number;
    avgRating: number | null;
    avgReviewCount: number;
    withoutWebsitePct: number;
    avgLeadScore: number;
  };
  reason: string;
  tags: string[];
  demand: string;
}

export interface NichesResponse {
  location: string;
  totalLeadsAnalyzed: number;
  suggestions: NicheSuggestion[];
  insights: { hotNiches: string[]; saturated: string[] };
  generatedAt: string;
}

export async function getNicheSuggestions(params: { location: string; limit?: number; competition?: string }): Promise<NichesResponse> {
  const usp = new URLSearchParams();
  if (params.location) usp.set("location", params.location);
  if (params.limit) usp.set("limit", String(params.limit));
  if (params.competition) usp.set("competition", params.competition);
  const res = await fetch(`${API_URL}/niches/suggest?${usp.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch niche suggestions");
  return data.data as NichesResponse;
}
