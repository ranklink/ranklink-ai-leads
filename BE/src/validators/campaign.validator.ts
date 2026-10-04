import { z } from "zod";

export const campaignConfigSchema = z.object({
  keyword: z.string().trim().min(2).max(100),
  location: z.string().trim().min(2).max(200),
  offer: z.string().trim().min(10).max(2000),
  senderName: z.string().trim().min(2).max(100),
  qualificationCriteria: z.string().trim().min(10).max(2000),
  limit: z.number().int().min(1).max(20).default(10),
  minimumScore: z.number().int().min(0).max(100).default(50),
  website: z.enum(["ANY", "HAS_WEBSITE", "NO_WEBSITE"]).default("ANY"),
  intervalHours: z.number().int().min(24).max(720).nullable().default(null),
  maxAiCalls: z.number().int().min(1).max(80).default(40),
  maxGoogleCalls: z.number().int().min(1).max(30).default(22),
  mode: z.enum(["DRAFT_ONLY", "AUTO_SEND"]).default("DRAFT_ONLY"),
  maxDailySends: z.number().int().min(1).max(500).default(20),
  minQualificationConfidence: z.number().min(0).max(1).default(0.8),
  minContactConfidence: z.number().min(0).max(1).default(0.8),
  requireVerifiedContact: z.boolean().default(true),
  followUpEnabled: z.boolean().default(false),
}).strict();
export const createCampaignSchema = z.object({ name: z.string().trim().min(2).max(120), config: campaignConfigSchema }).strict();
export const updateCampaignSchema = createCampaignSchema.extend({ version: z.number().int().positive() });
export const pageSchema = z.object({ page: z.coerce.number().int().min(1).max(100000).default(1), limit: z.coerce.number().int().min(1).max(50).default(20) });
export const draftReviewSchema = z.object({ version: z.number().int().positive(), action: z.enum(["APPROVE", "REJECT"]) }).strict();
export const draftEditSchema = z.object({ version: z.number().int().positive(), subject: z.string().trim().min(1).max(200), body: z.string().trim().min(1).max(5000) }).strict();
export type CampaignConfig = z.infer<typeof campaignConfigSchema>;
