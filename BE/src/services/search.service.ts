import { searchRepository } from "../repositories/search.repository";
import { leadRepository } from "../repositories/lead.repository";
import { searchPlaces, searchAndEnrich, normalizePlace } from "./google-places.service";
import { calculateLeadScore } from "./lead-scoring.service";
import { detectOpportunities, opportunitySummary } from "./opportunity.service";
import { ApiError } from "../utils/api-error";
import prisma from "../config/database";
import type { SearchLeadsInput } from "../validators/lead-search.validator";

export class SearchService {
  async searchLeads(input: SearchLeadsInput) {
    // Create search record as PENDING then PROCESSING
    const search = await searchRepository.create({
      keyword: input.keyword,
      location: input.location,
      radius: input.radius,
      minimumRating: input.minimumRating,
      websiteFilter: input.website as any,
      requestedCount: input.limit,
      status: "PROCESSING",
    });

    try {
      const textQuery = `${input.keyword} in ${input.location}`;
      const normalized = await searchAndEnrich(textQuery, input.limit);

      // Apply filters that are lead-level
      let filtered = normalized;

      if (input.minimumRating !== undefined) {
        filtered = filtered.filter((l) => (l.rating ?? 0) >= input.minimumRating!);
      }

      if (input.website === "HAS_WEBSITE") {
        filtered = filtered.filter((l) => !!l.website);
      } else if (input.website === "NO_WEBSITE") {
        filtered = filtered.filter((l) => !l.website);
      }

      // Upsert each lead
      const leadIds: string[] = [];
      const leadsForResponse: any[] = [];

      for (const n of filtered) {
        const score = calculateLeadScore({
          website: n.website,
          rating: n.rating,
          reviewCount: n.reviewCount,
          phone: n.phone,
          businessStatus: n.businessStatus,
        });

        const opportunities = detectOpportunities({
          website: n.website,
          reviewCount: n.reviewCount,
          rating: n.rating,
          phone: n.phone,
        });

        const summary = opportunitySummary(opportunities);
        const websiteExists = !!n.website;

        const lead = await leadRepository.upsertLead({
          placeId: n.placeId,
          name: n.name,
          category: n.category,
          primaryType: n.primaryType,
          address: n.address,
          latitude: n.latitude,
          longitude: n.longitude,
          phone: n.phone,
          internationalPhone: n.internationalPhone,
          website: n.website,
          googleMapsUrl: n.googleMapsUrl,
          rating: n.rating,
          reviewCount: n.reviewCount,
          businessStatus: n.businessStatus,
          websiteExists,
          leadScore: score,
          opportunitySummary: summary,
        });

        // Upsert reviews if available
        if (n.reviews && n.reviews.length > 0) {
          await leadRepository.upsertReviews(lead.id, n.reviews);
        }

        leadIds.push(lead.id);
        leadsForResponse.push({ ...lead, opportunities });
      }

      // Create relationships
      await searchRepository.addLeads(search.id, leadIds);

      // Update search record
      const updated = await searchRepository.update(search.id, {
        status: "COMPLETED",
        resultCount: leadsForResponse.length,
      });

      return {
        searchId: search.id,
        keyword: input.keyword,
        location: input.location,
        status: "COMPLETED",
        resultCount: leadsForResponse.length,
        leads: leadsForResponse,
      };
    } catch (err: any) {
      await searchRepository.update(search.id, {
        status: "FAILED",
        errorMessage: err.message || "Search failed",
      });
      throw new ApiError(500, err.message || "Search failed");
    }
  }

  async getSearches(page: number, limit: number) {
    const { items, total } = await searchRepository.findMany(page, limit);
    const pagination = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
    return { items, pagination };
  }

  async getSearchById(id: string) {
    const search = await searchRepository.findById(id);
    if (!search) return null;
    const leads = search.leads.map((sl: any) => {
      const lead = sl.lead;
      const opportunities = detectOpportunities({
        website: lead.website,
        reviewCount: lead.reviewCount,
        rating: lead.rating,
        phone: lead.phone,
      });
      return { ...lead, opportunities };
    });
    return {
      ...search,
      leads,
    };
  }
}

export const searchService = new SearchService();
