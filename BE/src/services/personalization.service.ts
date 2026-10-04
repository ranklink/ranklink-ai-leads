import { Lead } from "@prisma/client";

export type OutreachProfile = "NO_WEBSITE" | "REVIEW_GROWTH" | "REPUTATION" | "LOCAL_PRESENCE";

export interface EmailDraft {
  profile: OutreachProfile;
  offer: string;
  subject: string;
  body: string;
  source: "template" | "nvidia";
}

function getProfile(lead: Pick<Lead, "websiteExists" | "reviewCount" | "rating">): OutreachProfile {
  if (!lead.websiteExists) return "NO_WEBSITE";
  if (lead.reviewCount < 20) return "REVIEW_GROWTH";
  if ((lead.rating ?? 0) < 4.2) return "REPUTATION";
  return "LOCAL_PRESENCE";
}

function profileOffer(profile: OutreachProfile, category: string): string {
  switch (profile) {
    case "NO_WEBSITE": return `a simple website that helps ${category} businesses turn local searches into enquiries`;
    case "REVIEW_GROWTH": return "a practical system for collecting more genuine customer reviews";
    case "REPUTATION": return "a few practical ideas to improve local visibility and customer trust";
    case "LOCAL_PRESENCE": return "a quick review of ways to convert more local search traffic into customers";
  }
}

export function buildDeterministicDraft(lead: Pick<Lead, "name" | "category" | "primaryType" | "address" | "websiteExists" | "reviewCount" | "rating">, recipientName?: string | null, senderName = "Your Name"): EmailDraft {
  const profile = getProfile(lead);
  const category = lead.category || lead.primaryType || "local service";
  const location = lead.address?.split(",").slice(-2).join(",").trim() || "your area";
  const greeting = recipientName?.trim() ? `Hi ${recipientName.trim()},` : `Hi ${lead.name} team,`;
  const observation = profile === "NO_WEBSITE"
    ? `I noticed ${lead.name} doesn’t appear to have a website listed on Google.`
    : profile === "REVIEW_GROWTH"
      ? `${lead.name} has a good local foundation, with ${lead.reviewCount} Google reviews.`
      : profile === "REPUTATION"
        ? `${lead.name} is visible in local search in ${location}.`
        : `${lead.name} already has a strong local presence with ${lead.reviewCount} Google reviews${lead.rating ? ` and a ${lead.rating}/5 rating` : ""}.`;

  return {
    profile,
    offer: profileOffer(profile, category),
    subject: profile === "NO_WEBSITE" ? `A quick idea for ${lead.name}` : `A local growth idea for ${lead.name}`,
    body: `${greeting}\n\n${observation} I work with ${category} businesses on ${profileOffer(profile, category)}.\n\nWould it be useful if I sent over two specific ideas for ${lead.name}?\n\nBest,\n${senderName}\n\nP.S. If you’d rather not receive messages from me, just say so and I won’t follow up.`,
    source: "template",
  };
}

export function getProfileForTesting(lead: Pick<Lead, "websiteExists" | "reviewCount" | "rating">): OutreachProfile {
  return getProfile(lead);
}
