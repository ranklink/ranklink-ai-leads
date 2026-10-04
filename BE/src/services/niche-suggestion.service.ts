import prisma from "../config/database";
import { currentOrganization } from "../auth/context";
import { env } from "../config/env";

// Curated low-competition niches for India / global - high opportunity for agencies/freelancers
// Each has baseline demand and typical website gap. Used as fallback + blended with DB signals.
export interface CuratedNiche {
  niche: string;
  category: string;
  demand: string;
  avgCompetitionHint: "LOW" | "MEDIUM" | "HIGH";
  tags: string[];
  reason: string;
}

const CURATED_NICHES: CuratedNiche[] = [
  { niche: "Solar Panel Installer", category: "solar_energy", demand: "High - subsidies, B2B + residential", avgCompetitionHint: "LOW", tags: ["Green", "B2B", "High ticket"], reason: "Government push, few have good websites" },
  { niche: "EV Charging Station", category: "ev_services", demand: "Emerging - infra gap", avgCompetitionHint: "LOW", tags: ["EV", "Infra"], reason: "Exploding demand, very low digital presence" },
  { niche: "Hydroponics Farm", category: "agriculture", demand: "Niche - urban farming", avgCompetitionHint: "LOW", tags: ["AgriTech"], reason: "Rare, wellness-focused clientele" },
  { niche: "Cold Storage Warehouse", category: "logistics", demand: "High - perishables supply chain", avgCompetitionHint: "LOW", tags: ["B2B", "Logistics"], reason: "Essential but neglected online" },
  { niche: "Pet Grooming", category: "pet_services", demand: "Rising - pet economy", avgCompetitionHint: "LOW", tags: ["Local", "Repeat"], reason: "Love to spend, few professional sites" },
  { niche: "Dental Implant Clinic", category: "dentist", demand: "High ticket - medical", avgCompetitionHint: "MEDIUM", tags: ["Medical", "High ticket"], reason: "High value per lead, website = trust" },
  { niche: "Physiotherapy Center", category: "physiotherapist", demand: "Growing - post-COVID rehab", avgCompetitionHint: "LOW", tags: ["Health"], reason: "Often missing booking system" },
  { niche: "IELTS Coaching", category: "education", demand: "High - study abroad", avgCompetitionHint: "MEDIUM", tags: ["Education"], reason: "Students search online heavily" },
  { niche: "Interior Designer", category: "interior_designer", demand: "High - real estate boom", avgCompetitionHint: "MEDIUM", tags: ["Creative", "High ticket"], reason: "Portfolio site doubles conversions" },
  { niche: "Modular Kitchen", category: "kitchen_remodeler", demand: "High", avgCompetitionHint: "LOW", tags: ["Home"], reason: "Visual proof needed, many offline only" },
  { niche: "Water Purifier Service", category: "appliance_repair", demand: "Recurring - AMC", avgCompetitionHint: "LOW", tags: ["Service", "Recurring"], reason: "Repeat service, weak SEO" },
  { niche: "CCTV Installer", category: "security", demand: "High - SMEs", avgCompetitionHint: "LOW", tags: ["Security"], reason: "B2B leads via maps, low site quality" },
  { niche: "Packers and Movers", category: "movers", demand: "Very high - always moving", avgCompetitionHint: "HIGH", tags: ["Logistics"], reason: "Competitive but huge no-website tail" },
  { niche: "Car Detailing Studio", category: "car_wash", demand: "Premium auto care", avgCompetitionHint: "LOW", tags: ["Auto"], reason: "Instagram but no website/booking" },
  { niche: "Veterinary Clinic", category: "veterinarian", demand: "Essential - growing pets", avgCompetitionHint: "LOW", tags: ["Medical"], reason: "Trust + emergency search, few modern sites" },
  { niche: "Ayurveda Clinic", category: "ayurveda", demand: "High - wellness trend", avgCompetitionHint: "LOW", tags: ["Wellness"], reason: "Tourist + local demand, weak digital" },
  { niche: "Coworking Space", category: "coworking", demand: "Medium - freelancer growth", avgCompetitionHint: "MEDIUM", tags: ["Real estate"], reason: "Needs booking, SEO gap" },
  { niche: "Cloud Kitchen", category: "restaurant", demand: "High - food delivery", avgCompetitionHint: "MEDIUM", tags: ["Food"], reason: "Often only on Swiggy, no own site" },
  { niche: "Dance Studio", category: "dance_school", demand: "Youth hobby", avgCompetitionHint: "LOW", tags: ["Education"], reason: "Social only, no funnel" },
  { niche: "Tattoo Studio", category: "tattoo_shop", demand: "Youth premium", avgCompetitionHint: "LOW", tags: ["Creative"], reason: "Portfolio = website win" },
  { niche: "Organic Grocery Store", category: "grocery", demand: "Wellness premium", avgCompetitionHint: "LOW", tags: ["Retail"], reason: "Local SEO goldmine" },
  { niche: "Laundry & Dry Cleaning", category: "laundry", demand: "Urban recurring", avgCompetitionHint: "LOW", tags: ["Service"], reason: "Pickup scheduling = opportunity" },
  { niche: "Astrologer", category: "astrologer", demand: "High - India specific", avgCompetitionHint: "MEDIUM", tags: ["Spiritual"], reason: "High search, cred via site" },
  { niche: "Driving School", category: "driving_school", demand: "Stable", avgCompetitionHint: "MEDIUM", tags: ["Education"], reason: "Reviews matter, sites dated" },
  { niche: "Gym / Fitness Center", category: "gym", demand: "Very high", avgCompetitionHint: "HIGH", tags: ["Fitness"], reason: "Crowded but 40% still no site" },
  { niche: "Yoga Studio", category: "yoga_studio", demand: "Global wellness", avgCompetitionHint: "LOW", tags: ["Wellness"], reason: "Workshops need landing pages" },
  { niche: "Preschool / Daycare", category: "preschool", demand: "High - working parents", avgCompetitionHint: "LOW", tags: ["Education", "Parents"], reason: "Trust critical, site = admissions" },
  { niche: "Real Estate Broker", category: "real_estate", demand: "High ticket", avgCompetitionHint: "HIGH", tags: ["High ticket"], reason: "Noisy but micro-niches exist" },
  { niche: "Wedding Photographer", category: "photographer", demand: "Seasonal spike", avgCompetitionHint: "MEDIUM", tags: ["Creative"], reason: "Portfolio decides booking" },
  { niche: "Car Rental", category: "car_rental", demand: "Tourist + local", avgCompetitionHint: "MEDIUM", tags: ["Travel"], reason: "Needs booking engine" },
];

export interface NicheSuggestion {
  niche: string;
  category: string;
  competition: "LOW" | "MEDIUM" | "HIGH";
  competitionScore: number; // 0-100, lower = less competition = better
  opportunityScore: number; // 0-100 higher = more opportunity
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

function competitionFromCount(count: number, maxCount: number): { level: "LOW" | "MEDIUM" | "HIGH"; score: number } {
  if (maxCount === 0) return { level: "LOW", score: 20 };
  const normalized = (count / maxCount) * 100; // 0..100
  if (count <= 3) return { level: "LOW", score: Math.min(30, normalized + 10) };
  if (count <= 10) return { level: "MEDIUM", score: Math.min(65, normalized + 15) };
  return { level: "HIGH", score: Math.min(95, normalized + 20) };
}

export class NicheSuggestionService {
  async suggest(params: { location: string; limit?: number; minCompetition?: string }) {
    const limit = Math.min(Math.max(params.limit ?? 12, 1), 30);
    const location = params.location?.trim() ?? "";

    // 1. Pull leads for analysis. Never broaden a requested location to the full database:
    // doing so makes a country/province analysis look successful while mixing unrelated markets.
    let leads: any[] = [];
    let totalAnalyzed = 0;

    try {
      const where: any = {};
      if (location.length >= 2) {
        leads = await prisma.lead.findMany({
          where: { organizationId: currentOrganization(), address: { contains: location } },
          select: { category: true, primaryType: true, rating: true, reviewCount: true, websiteExists: true, leadScore: true, address: true },
          take: 5000,
        });
        totalAnalyzed = leads.length;
      } else {
        leads = await prisma.lead.findMany({
          where: { organizationId: currentOrganization() },
          select: { category: true, primaryType: true, rating: true, reviewCount: true, websiteExists: true, leadScore: true },
          take: 5000,
        });
        totalAnalyzed = leads.length;
      }
    } catch (e) {
      console.warn("[niche] DB fetch failed", e);
      leads = [];
      totalAnalyzed = 0;
    }

    // 2. Aggregate by category/primaryType
    const groups = new Map<string, { count: number; sumRating: number; ratedCount: number; sumReviews: number; noWebsite: number; sumScore: number; niche: string; category: string; tags: string[]; demand: string }>();

    // Initialize with curated niches so even empty DB returns suggestions
    for (const c of CURATED_NICHES) {
      const key = (c.category || c.niche).toLowerCase();
      if (!groups.has(key)) {
        groups.set(key, { count: 0, sumRating: 0, ratedCount: 0, sumReviews: 0, noWebsite: 0, sumScore: 0, niche: c.niche, category: c.category, tags: c.tags, demand: c.demand });
      }
    }

    // Merge real DB stats
    for (const l of leads) {
      const raw = (l.primaryType || l.category || "").toLowerCase().trim();
      if (!raw) continue;
      // Try to map to curated key, otherwise create bucket
      let key = raw;
      // fuzzy: if curated contains this type, map to curated niche
      const curatedMatch = CURATED_NICHES.find((c) => c.category.toLowerCase() === raw || c.niche.toLowerCase() === raw);
      if (curatedMatch) key = curatedMatch.category.toLowerCase();

      if (!groups.has(key)) {
        // derive display niche from raw
        const display = raw.replace(/_/g, " ").replace(/\b\w/g, (m: string) => m.toUpperCase());
        groups.set(key, { count: 0, sumRating: 0, ratedCount: 0, sumReviews: 0, noWebsite: 0, sumScore: 0, niche: display, category: raw, tags: [], demand: "Local demand" });
      }
      const g = groups.get(key)!;
      g.count += 1;
      if (l.rating !== null && l.rating !== undefined) { g.sumRating += l.rating; g.ratedCount += 1; }
      g.sumReviews += l.reviewCount ?? 0;
      if (!l.websiteExists) g.noWebsite += 1;
      g.sumScore += l.leadScore ?? 0;
    }

    // Add unknown curated that still have 0 count -> keep them but give synthetic metrics
    const maxCount = Math.max(...Array.from(groups.values()).map((g) => g.count), 1);

    const suggestions: NicheSuggestion[] = Array.from(groups.values()).map((g) => {
      const avgRating = g.ratedCount ? Number((g.sumRating / g.ratedCount).toFixed(2)) : null;
      const avgReviewCount = g.count ? Math.round(g.sumReviews / g.count) : 25; // fallback
      const withoutWebsitePct = g.count ? Math.round((g.noWebsite / g.count) * 100) : 65; // curated assumption
      const avgLeadScore = g.count ? Math.round(g.sumScore / g.count) : 72;

      const { level, score: competitionScore } = competitionFromCount(g.count, maxCount);

      // Blend curated hint if count==0
      let finalLevel = level;
      let finalScore = competitionScore;
      if (g.count === 0) {
        const curated = CURATED_NICHES.find((c) => c.category.toLowerCase() === g.category.toLowerCase() || c.niche === g.niche);
        if (curated) {
          if (curated.avgCompetitionHint === "LOW") { finalLevel = "LOW"; finalScore = 18 + Math.random() * 12; }
          else if (curated.avgCompetitionHint === "MEDIUM") { finalLevel = "MEDIUM"; finalScore = 45 + Math.random() * 15; }
          else { finalLevel = "HIGH"; finalScore = 75 + Math.random() * 10; }
        }
      }

      // opportunityScore: higher when low competition, high without website %, low avg reviews, high avgLeadScore
      const withoutWebsiteFactor = withoutWebsitePct / 100; // 0..1
      const reviewGap = Math.max(0, 1 - avgReviewCount / 100); // fewer reviews = higher gap
      const competitionGap = 1 - finalScore / 100;
      const leadScoreFactor = avgLeadScore / 100;
      const opportunityScore = Math.round((withoutWebsiteFactor * 0.35 + reviewGap * 0.25 + competitionGap * 0.25 + leadScoreFactor * 0.15) * 100);

      // Build reason
      let reason = "";
      if (g.count === 0) {
        const curated = CURATED_NICHES.find((c) => c.niche === g.niche);
        reason = curated ? curated.reason : "Few businesses have strong online presence - outreach will stand out";
      } else {
        reason = `${g.count} competitors found • ${withoutWebsitePct}% without websites • Avg ${avgReviewCount} reviews${avgRating ? ` • ${avgRating}★ avg` : ""} → ${finalLevel === "LOW" ? "low saturation" : finalLevel === "MEDIUM" ? "moderate competition" : "crowded but website gap persists"}`;
      }

      return {
        niche: g.niche,
        category: g.category,
        competition: finalLevel,
        competitionScore: Math.round(finalScore),
        opportunityScore,
        metrics: {
          count: g.count,
          avgRating,
          avgReviewCount,
          withoutWebsitePct,
          avgLeadScore,
        },
        reason,
        tags: g.tags,
        demand: g.demand,
      };
    });

    // Optional: if OPENAI_API_KEY set, we could enhance with LLM re-ranking (keep heuristic as fallback)
    // For now heuristic is the AI; LLM integration can be added later without breaking API
    if (env.GOOGLE_PLACES_API_KEY && process.env.OPENAI_API_KEY) {
      // Future: call OpenAI to re-rank or generate niche descriptions. Skipped to avoid latency/cost for MVP.
    }

    // Sort by opportunityScore desc, competitionScore asc
    suggestions.sort((a, b) => b.opportunityScore - a.opportunityScore || a.competitionScore - b.competitionScore);

    // Filter if minCompetition requested? e.g., only LOW
    let filtered = suggestions;
    if (params.minCompetition) {
      const want = params.minCompetition.toUpperCase();
      if (want === "LOW") filtered = filtered.filter((s) => s.competition === "LOW");
      else if (want === "MEDIUM") filtered = filtered.filter((s) => s.competition !== "HIGH");
    }

    const top = filtered.slice(0, limit);

    return {
      location: location || "All regions",
      totalLeadsAnalyzed: totalAnalyzed,
      suggestions: top,
      insights: {
        hotNiches: suggestions.filter((s) => s.competition === "LOW").slice(0, 3).map((s) => s.niche),
        saturated: suggestions.filter((s) => s.competition === "HIGH").slice(0, 3).map((s) => s.niche),
      },
      generatedAt: new Date().toISOString(),
    };
  }
}

export const nicheSuggestionService = new NicheSuggestionService();
