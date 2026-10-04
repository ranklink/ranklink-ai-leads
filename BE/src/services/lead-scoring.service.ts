import { LeadScoreInput } from "../types/lead.types";

export function calculateLeadScore(lead: LeadScoreInput): number {
  let score = 0;

  if (!lead.website) {
    score += 35;
  } else {
    score += 5;
  }

  if (lead.phone) {
    score += 10;
  }

  const reviewCount = lead.reviewCount ?? 0;
  if (reviewCount <= 10) {
    score += 20;
  } else if (reviewCount <= 50) {
    score += 15;
  } else if (reviewCount <= 100) {
    score += 5;
  }

  if (lead.rating !== null && lead.rating !== undefined) {
    if (lead.rating >= 3 && lead.rating <= 4.2) {
      score += 15;
    } else if (lead.rating > 4.2) {
      score += 5;
    }
  }

  if (lead.businessStatus === "OPERATIONAL") {
    score += 5;
  }

  return Math.min(score, 100);
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return "Hot";
  if (score >= 60) return "Good";
  if (score >= 40) return "Warm";
  return "Low";
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "bg-red-500";
  if (score >= 60) return "bg-orange-500";
  if (score >= 40) return "bg-yellow-500";
  return "bg-gray-400";
}
