import { Opportunity } from "../types/lead.types";

interface OpportunityInput {
  website?: string | null;
  reviewCount?: number;
  rating?: number | null;
  phone?: string | null;
}

export function detectOpportunities(input: OpportunityInput): Opportunity[] {
  const opportunities: Opportunity[] = [];

  if (!input.website) {
    opportunities.push({ type: "NO_WEBSITE", label: "No website" });
  }

  const rc = input.reviewCount ?? 0;
  if (rc <= 20) {
    opportunities.push({ type: "LOW_REVIEW_COUNT", label: "Low Google review count" });
  }

  if (input.rating !== null && input.rating !== undefined) {
    if (input.rating >= 3 && input.rating <= 4.2) {
      opportunities.push({ type: "REPUTATION_OPPORTUNITY", label: "Reputation opportunity" });
    }
  } else if (rc <= 10) {
    // also reputation if very few reviews handled via LOW_REVIEW_COUNT, add reputation if no rating but low reviews?
  }

  if (input.phone) {
    opportunities.push({ type: "PHONE_AVAILABLE", label: "Direct contact available" });
  }

  if (rc > 100 && input.rating !== null && input.rating !== undefined && input.rating > 4.2) {
    opportunities.push({ type: "STRONG_LOCAL_PRESENCE", label: "Strong local presence" });
  }

  return opportunities;
}

export function opportunitySummary(opportunities: Opportunity[]): string {
  return opportunities.map((o) => o.label).join(", ");
}
