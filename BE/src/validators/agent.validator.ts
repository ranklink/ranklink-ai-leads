import { z } from "zod";

export const idempotencyKeySchema = z.string().min(8).max(191).regex(/^[a-zA-Z0-9:_-]+$/);
export const queueResearchSchema = z.object({ campaignId: z.string().min(1).max(191) }).strict();
export const leadReviewSchema = z.object({
  version: z.number().int().positive(),
  decision: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().trim().max(1000).optional(),
  recipientEmail: z.string().email().nullable().optional(),
  recipientName: z.string().trim().max(191).nullable().optional(),
}).strict();
export const draftReviewSchema = z.object({ version: z.number().int().positive(), decision: z.enum(["APPROVED", "REJECTED"]), note: z.string().trim().max(1000).optional() }).strict();
export const draftUpdateSchema = z.object({ version: z.number().int().positive(), subject: z.string().trim().min(1).max(200), body: z.string().trim().min(1).max(5000), recipientEmail: z.string().email(), recipientName: z.string().trim().max(191).nullable().optional() }).strict();
export const suppressionSchema = z.object({ contact: z.string().email(), reason: z.string().trim().min(2).max(191) }).strict();
export const analyticsJobSchema = z.object({ campaignId: z.string().min(1).max(191).nullable().default(null), periodStart: z.coerce.date(), periodEnd: z.coerce.date() }).strict().refine(value => value.periodEnd > value.periodStart, { message: "periodEnd must be after periodStart" });

