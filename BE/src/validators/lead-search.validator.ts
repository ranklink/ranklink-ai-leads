import { z } from "zod";

export const searchLeadsSchema = z.object({
  keyword: z.string().trim().min(2).max(100),
  location: z.string().trim().min(2).max(200),
  radius: z.number().int().min(1000).max(50000).default(10000),
  limit: z.number().int().min(1).max(100).default(20),
  minimumRating: z.number().min(0).max(5).optional(),
  website: z.enum(["ANY", "HAS_WEBSITE", "NO_WEBSITE"]).default("ANY"),
});

export type SearchLeadsInput = z.infer<typeof searchLeadsSchema>;

export const leadFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().optional(),
  website: z.enum(["ANY", "HAS_WEBSITE", "NO_WEBSITE"]).optional().default("ANY"),
  minRating: z.coerce.number().min(0).max(5).optional(),
  maxRating: z.coerce.number().min(0).max(5).optional(),
  minReviews: z.coerce.number().int().min(0).optional(),
  maxReviews: z.coerce.number().int().min(0).optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  maxScore: z.coerce.number().int().min(0).max(100).optional(),
  businessStatus: z.string().trim().optional(),
  sortBy: z.enum(["leadScore", "rating", "reviewCount", "name", "createdAt"]).optional().default("leadScore"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});
