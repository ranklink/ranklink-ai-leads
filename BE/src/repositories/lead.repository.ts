import prisma from "../config/database";
import { Prisma } from "@prisma/client";
import { currentOrganization } from "../auth/context";

export class LeadRepository {
  async upsertLead(data: {
    placeId: string;
    name: string;
    category?: string | null;
    primaryType?: string | null;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    phone?: string | null;
    internationalPhone?: string | null;
    website?: string | null;
    googleMapsUrl?: string | null;
    rating?: number | null;
    reviewCount: number;
    businessStatus?: string | null;
    websiteExists: boolean;
    leadScore: number;
    opportunitySummary?: string | null;
  }) {
    return prisma.lead.upsert({
      where: { organizationId_placeId: { organizationId: currentOrganization(), placeId: data.placeId } },
      update: {
        name: data.name,
        category: data.category,
        primaryType: data.primaryType,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        phone: data.phone,
        internationalPhone: data.internationalPhone,
        website: data.website,
        googleMapsUrl: data.googleMapsUrl,
        rating: data.rating,
        reviewCount: data.reviewCount,
        businessStatus: data.businessStatus,
        websiteExists: data.websiteExists,
        leadScore: data.leadScore,
        opportunitySummary: data.opportunitySummary,
        updatedAt: new Date(),
      },
      create: {
        organizationId: currentOrganization(),
        placeId: data.placeId,
        name: data.name,
        category: data.category,
        primaryType: data.primaryType,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        phone: data.phone,
        internationalPhone: data.internationalPhone,
        website: data.website,
        googleMapsUrl: data.googleMapsUrl,
        rating: data.rating,
        reviewCount: data.reviewCount,
        businessStatus: data.businessStatus,
        websiteExists: data.websiteExists,
        leadScore: data.leadScore,
        opportunitySummary: data.opportunitySummary,
      },
    });
  }

  async findMany(filters: {
    where: Prisma.LeadWhereInput;
    skip: number;
    take: number;
    orderBy: Prisma.LeadOrderByWithRelationInput;
    includeReviews?: boolean;
  }) {
    const [items, total] = await Promise.all([
      prisma.lead.findMany({
        where: { AND: [filters.where, { organizationId: currentOrganization() }] },
        skip: filters.skip,
        take: filters.take,
        orderBy: filters.orderBy,
        include: filters.includeReviews ? { reviews: true } : undefined,
      }),
      prisma.lead.count({ where: { AND: [filters.where, { organizationId: currentOrganization() }] } }),
    ]);
    return { items, total };
  }

  async findById(id: string) {
    return prisma.lead.findUnique({
      where: { id, organizationId: currentOrganization() },
      include: { reviews: { orderBy: { createdAt: "desc" } } },
    });
  }

  async findByPlaceId(placeId: string) {
    return prisma.lead.findUnique({ where: { organizationId_placeId: { organizationId: currentOrganization(), placeId } } });
  }

  async findAllFiltered(where: Prisma.LeadWhereInput, orderBy?: Prisma.LeadOrderByWithRelationInput) {
    return prisma.lead.findMany({ where: { AND: [where, { organizationId: currentOrganization() }] }, orderBy });
  }

  async count(where?: Prisma.LeadWhereInput) {
    return prisma.lead.count({ where: { ...where, organizationId: currentOrganization() } });
  }

  async upsertReviews(leadId: string, reviews: { author: string | null; rating: number | null; comment: string | null; publishedAt: Date | null }[]) {
    if (!reviews || reviews.length === 0) return;
    await prisma.lead.findUniqueOrThrow({ where: { id: leadId, organizationId: currentOrganization() } });
    // Delete existing to avoid duplicates? Keep simple: delete then create
    await prisma.review.deleteMany({ where: { leadId } });
    await prisma.review.createMany({
      data: reviews.map((r) => ({
        leadId,
        author: r.author,
        rating: r.rating,
        comment: r.comment,
        publishedAt: r.publishedAt,
      })),
    });
  }
}

export const leadRepository = new LeadRepository();
