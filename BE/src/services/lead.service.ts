import { Prisma } from "@prisma/client";
import { leadRepository } from "../repositories/lead.repository";
import { getPagination, buildPaginationMeta } from "../utils/pagination";
import { leadsToCsv } from "../utils/csv";
import { detectOpportunities, opportunitySummary } from "./opportunity.service";

export class LeadService {
  async getLeads(query: any) {
    const { page, limit, skip, take } = getPagination(query.page, query.limit);
    const where: Prisma.LeadWhereInput = {};

    if (query.search) {
      const s = query.search as string;
      where.OR = [
        { name: { contains: s } },
        { address: { contains: s } },
        { category: { contains: s } },
      ];
    }

    if (query.website === "HAS_WEBSITE") where.websiteExists = true;
    else if (query.website === "NO_WEBSITE") where.websiteExists = false;

    if (query.minRating !== undefined || query.maxRating !== undefined) {
      where.rating = {};
      if (query.minRating !== undefined) (where.rating as any).gte = Number(query.minRating);
      if (query.maxRating !== undefined) (where.rating as any).lte = Number(query.maxRating);
    }

    if (query.minReviews !== undefined || query.maxReviews !== undefined) {
      where.reviewCount = {};
      if (query.minReviews !== undefined) (where.reviewCount as any).gte = Number(query.minReviews);
      if (query.maxReviews !== undefined) (where.reviewCount as any).lte = Number(query.maxReviews);
    }

    if (query.minScore !== undefined || query.maxScore !== undefined) {
      where.leadScore = {};
      if (query.minScore !== undefined) (where.leadScore as any).gte = Number(query.minScore);
      if (query.maxScore !== undefined) (where.leadScore as any).lte = Number(query.maxScore);
    }

    if (query.businessStatus) {
      where.businessStatus = query.businessStatus;
    }

    const sortBy = query.sortBy || "leadScore";
    const sortOrder = query.sortOrder || "desc";
    const orderBy: Prisma.LeadOrderByWithRelationInput = { [sortBy]: sortOrder };

    const { items, total } = await leadRepository.findMany({ where, skip, take, orderBy });

    // Attach opportunities dynamically if not stored
    const enriched = items.map((lead) => ({
      ...lead,
      opportunities: detectOpportunities({
        website: lead.website,
        reviewCount: lead.reviewCount,
        rating: lead.rating,
        phone: lead.phone,
      }),
    }));

    return {
      items: enriched,
      pagination: buildPaginationMeta(page, limit, total),
    };
  }

  async getLeadById(id: string) {
    const lead = await leadRepository.findById(id);
    if (!lead) return null;
    const opportunities = detectOpportunities({
      website: lead.website,
      reviewCount: lead.reviewCount,
      rating: lead.rating,
      phone: lead.phone,
    });
    return { ...lead, opportunities };
  }

  async getLeadsForExport(query: any) {
    const where: Prisma.LeadWhereInput = {};

    if (query.search) {
      const s = query.search as string;
      where.OR = [{ name: { contains: s } }, { address: { contains: s } }, { category: { contains: s } }];
    }
    if (query.website === "HAS_WEBSITE") where.websiteExists = true;
    else if (query.website === "NO_WEBSITE") where.websiteExists = false;

    if (query.minRating !== undefined) {
      where.rating = { ...(where.rating as any), gte: Number(query.minRating) };
    }
    if (query.maxRating !== undefined) {
      where.rating = { ...(where.rating as any), lte: Number(query.maxRating) };
    }
    if (query.minReviews !== undefined) {
      where.reviewCount = { ...(where.reviewCount as any), gte: Number(query.minReviews) };
    }
    if (query.maxReviews !== undefined) {
      where.reviewCount = { ...(where.reviewCount as any), lte: Number(query.maxReviews) };
    }
    if (query.minScore !== undefined) {
      where.leadScore = { ...(where.leadScore as any), gte: Number(query.minScore) };
    }
    if (query.maxScore !== undefined) {
      where.leadScore = { ...(where.leadScore as any), lte: Number(query.maxScore) };
    }
    if (query.businessStatus) where.businessStatus = query.businessStatus;

    const leads = await leadRepository.findAllFiltered(where, { leadScore: "desc" });
    return leads;
  }

  async exportCsv(query: any): Promise<string> {
    const leads = await this.getLeadsForExport(query);
    return leadsToCsv(leads);
  }
}

export const leadService = new LeadService();
