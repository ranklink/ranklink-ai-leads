import prisma from "../config/database";
import { Prisma } from "@prisma/client";
import { currentOrganization } from "../auth/context";

export class SearchRepository {
  async create(data: {
    keyword: string;
    location: string;
    radius?: number;
    minimumRating?: number;
    websiteFilter?: "ANY" | "HAS_WEBSITE" | "NO_WEBSITE";
    requestedCount: number;
    status?: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  }) {
    return prisma.leadSearch.create({
      data: {
        organizationId: currentOrganization(),
        keyword: data.keyword,
        location: data.location,
        radius: data.radius,
        minimumRating: data.minimumRating,
        websiteFilter: data.websiteFilter,
        requestedCount: data.requestedCount,
        status: data.status,
      },
    });
  }

  async update(id: string, data: Pick<Prisma.LeadSearchUpdateInput, "status" | "resultCount" | "errorMessage">) {
    return prisma.leadSearch.update({ where: { id, organizationId: currentOrganization() }, data });
  }

  async findById(id: string) {
    return prisma.leadSearch.findUnique({
      where: { id, organizationId: currentOrganization() },
      include: {
        leads: {
          include: { lead: { include: { reviews: true } } },
        },
      },
    });
  }

  async findMany(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.leadSearch.findMany({
        where: { organizationId: currentOrganization() },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { leads: true } } },
      }),
      prisma.leadSearch.count({ where: { organizationId: currentOrganization() } }),
    ]);
    return { items, total };
  }

  async addLeads(searchId: string, leadIds: string[]) {
    if (leadIds.length === 0) return;
    await prisma.leadSearch.findUniqueOrThrow({ where: { id: searchId, organizationId: currentOrganization() } });
    const count = await prisma.lead.count({ where: { id: { in: [...new Set(leadIds)] }, organizationId: currentOrganization() } });
    if (count !== new Set(leadIds).size) throw new Error("Search contains inaccessible leads");
    await prisma.searchLead.createMany({
      data: leadIds.map((leadId) => ({ searchId, leadId })),
      skipDuplicates: true,
    });
  }

  async countThisMonth() {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return prisma.leadSearch.count({
      where: { organizationId: currentOrganization(), createdAt: { gte: start } },
    });
  }
}

export const searchRepository = new SearchRepository();
