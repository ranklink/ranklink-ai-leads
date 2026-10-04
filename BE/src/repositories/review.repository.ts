import prisma from "../config/database";
import { currentOrganization } from "../auth/context";
import type { NormalizedReview } from "../types/google-places.types";

export class ReviewRepository {
  async createMany(leadId: string, reviews: NormalizedReview[]) {
    if (!reviews.length) return;
    await prisma.lead.findUniqueOrThrow({ where: { id: leadId, organizationId: currentOrganization() } });
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

  async findByLeadId(leadId: string) {
    return prisma.review.findMany({ where: { leadId, lead: { organizationId: currentOrganization() } }, orderBy: { createdAt: "desc" } });
  }
}

export const reviewRepository = new ReviewRepository();
