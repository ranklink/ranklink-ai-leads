import { z } from "zod";

export const evidenceSchema = z.object({
  id: z.string().min(1).max(100),
  fact: z.string().min(1).max(2000),
  sourceUrl: z.string().url().nullable(),
  observedAt: z.string().datetime(),
  sourceType: z.enum(["GOOGLE_PLACES", "BUSINESS_WEBSITE", "CUSTOMER_REVIEW", "APPLICATION"]),
}).strict();

export const researchInputSchema = z.object({
  leadId: z.string().min(1),
  name: z.string().min(1).max(255),
  category: z.string().nullable(),
  address: z.string().nullable(),
  website: z.string().url().nullable(),
  phone: z.string().nullable(),
  rating: z.number().min(0).max(5).nullable(),
  reviewCount: z.number().int().nonnegative(),
  businessStatus: z.string().nullable(),
  evidence: z.array(evidenceSchema).min(1).max(30),
}).strict();

export const researchOutputSchema = z.object({
  summary: z.string().min(1).max(3000),
  signals: z.array(z.object({ type: z.string().min(1).max(100), value: z.string().min(1).max(1000), confidence: z.number().min(0).max(1), evidenceIds: z.array(z.string()).min(1).max(10) }).strict()).max(20),
  evidenceIds: z.array(z.string()).min(1).max(30),
  missingFields: z.array(z.string().min(1).max(100)).max(20),
  confidence: z.number().min(0).max(1),
}).strict();

export const qualificationInputSchema = z.object({
  leadId: z.string().min(1),
  applicationScore: z.number().int().min(0).max(100),
  minimumScore: z.number().int().min(0).max(100),
  businessStatus: z.string().nullable(),
  criteria: z.string().min(1).max(2000),
  research: researchOutputSchema,
}).strict();

export const qualificationOutputSchema = z.object({
  score: z.number().int().min(0).max(100),
  fit: z.enum(["LOW", "MEDIUM", "HIGH"]),
  reasons: z.array(z.string().min(1).max(500)).min(1).max(10),
  risks: z.array(z.string().min(1).max(500)).max(10),
  recommendedAction: z.enum(["REJECT", "REVIEW", "APPROVE_FOR_OUTREACH"]),
  confidence: z.number().min(0).max(1),
}).strict();

export const outreachInputSchema = z.object({
  leadId: z.string().min(1),
  companyName: z.string().min(1).max(255),
  recipientName: z.string().max(191).nullable(),
  recipientEmail: z.string().email().nullable(),
  senderName: z.string().min(1).max(100),
  offer: z.string().min(1).max(2000),
  qualification: qualificationOutputSchema,
  evidence: z.array(evidenceSchema).min(1).max(30),
}).strict();

export const contactEnrichmentInputSchema = z.object({
  leadId: z.string().min(1),
  companyName: z.string().min(1).max(255),
  domain: z.string().min(1).max(253),
  candidates: z.array(z.object({
    name: z.string().max(191).nullable(),
    email: z.string().email(),
    role: z.string().max(191).nullable(),
    confidence: z.number().min(0).max(1),
    verificationStatus: z.string().max(50).nullable(),
  }).strict()).max(50),
}).strict();

export const contactEnrichmentOutputSchema = z.object({
  contacts: z.array(z.object({
    name: z.string().max(191).nullable(),
    email: z.string().email(),
    role: z.string().max(191).nullable(),
    confidence: z.number().min(0).max(1),
    verificationStatus: z.string().max(50).nullable(),
  }).strict()).max(10),
}).strict();

export const outreachOutputSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  cta: z.string().min(1).max(500),
  personalizationEvidenceIds: z.array(z.string()).min(1).max(10),
  confidence: z.number().min(0).max(1),
}).strict();

export const followUpInputSchema = z.object({
  leadId: z.string().min(1),
  companyName: z.string().min(1).max(255),
  originalSubject: z.string().min(1).max(200),
  originalBody: z.string().min(1).max(5000),
  sentAt: z.string().datetime(),
  senderName: z.string().min(1).max(100),
}).strict();

export const followUpOutputSchema = z.object({
  waitHours: z.number().int().min(24).max(720),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  reason: z.string().min(1).max(1000),
}).strict();

export const analyticsInputSchema = z.object({
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  metrics: z.record(z.number()),
}).strict();

export const analyticsOutputSchema = z.object({
  summary: z.string().min(1).max(3000),
  recommendations: z.array(z.string().min(1).max(500)).max(10),
}).strict();

export type ResearchInput = z.infer<typeof researchInputSchema>;
export type ResearchOutput = z.infer<typeof researchOutputSchema>;
export type QualificationInput = z.infer<typeof qualificationInputSchema>;
export type QualificationOutput = z.infer<typeof qualificationOutputSchema>;
export type OutreachInput = z.infer<typeof outreachInputSchema>;
export type ContactEnrichmentInput = z.infer<typeof contactEnrichmentInputSchema>;
export type FollowUpInput = z.infer<typeof followUpInputSchema>;
export type AnalyticsInput = z.infer<typeof analyticsInputSchema>;
