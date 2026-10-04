import { Prisma, type AgentJob } from "@prisma/client";
import { z } from "zod";
import prisma from "../../config/database";
import { currentOrganization, authContext } from "../../auth/context";
import { ApiError } from "../../utils/api-error";
import { campaignConfigSchema } from "../../validators/campaign.validator";
import { agentJobRepository } from "../../repositories/agent-job.repository";
import { runResearchAgent } from "../../agents/research.agent";
import { runQualificationAgent } from "../../agents/qualification.agent";
import { runContactEnrichmentAgent } from "../../agents/contact-enrichment.agent";
import { runOutreachAgent } from "../../agents/outreach.agent";
import { runFollowUpAgent } from "../../agents/followup.agent";
import { runAnalyticsAgent } from "../../agents/analytics.agent";
import { findContacts, sendEmail } from "../hunter.service";
import { env } from "../../config/env";
import type { ResearchInput } from "../../agents/schemas";

const researchJobInputSchema = z.object({ campaignId: z.string().min(1), version: z.number().int().positive() }).strict();
const qualificationJobInputSchema = z.object({ campaignId: z.string().min(1), researchId: z.string().min(1), version: z.number().int().positive() }).strict();
const enrichmentJobInputSchema = z.object({ version: z.number().int().positive() }).strict();
const outreachJobInputSchema = z.object({ qualificationId: z.string().min(1), version: z.number().int().positive(), recipientEmail: z.string().email().nullable(), recipientName: z.string().max(191).nullable() }).strict();
const followUpJobInputSchema = z.object({ draftId: z.string().min(1), version: z.number().int().positive() }).strict();
const analyticsJobInputSchema = z.object({ campaignId: z.string().min(1).nullable(), periodStart: z.string().datetime(), periodEnd: z.string().datetime() }).strict();

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function normalizedEmail(value: string): string {
  return value.trim().toLowerCase();
}

function safeSourceUrl(value: string | null): string | null {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === "https:" ? url.toString() : null; } catch { return null; }
}

async function campaignForJob(job: AgentJob, campaignId: string) {
  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, organizationId: job.organizationId } });
  if (!campaign) throw new Error("CAMPAIGN_NOT_FOUND");
  return { campaign, config: campaignConfigSchema.parse(campaign.config) };
}

function isVerifiedContact(status: string | null): boolean {
  return status?.trim().toLowerCase() === "valid";
}

async function selectCampaignRecipient(organizationId: string, leadId: string, config: z.infer<typeof campaignConfigSchema>) {
  const contacts = await prisma.leadContact.findMany({
    where: { organizationId, leadId },
    orderBy: [{ confidence: "desc" }, { createdAt: "asc" }],
    take: 20,
  });
  const contact = contacts.find(candidate => candidate.confidence >= config.minContactConfidence && (!config.requireVerifiedContact || isVerifiedContact(candidate.verificationStatus)));
  if (!contact) throw new Error("VERIFIED_CONTACT_REQUIRED");
  return { email: normalizedEmail(contact.email), name: contact.name };
}

async function assertSendPolicy(organizationId: string, campaignId: string, config: z.infer<typeof campaignConfigSchema>) {
  if (!env.OUTREACH_ENABLED) throw new Error("OUTREACH_DISABLED");
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const sentToday = await prisma.outreachEvent.count({
    where: {
      organizationId,
      occurredAt: { gte: dayStart },
      eventType: { in: ["SENT", "PENDING", "UNKNOWN", "FOLLOW_UP_SENT", "FOLLOW_UP_PENDING", "FOLLOW_UP_UNKNOWN"] },
      draft: { job: { assessment: { run: { campaignId } } } },
    },
  });
  if (sentToday >= config.maxDailySends) throw new Error("DAILY_SEND_LIMIT_REACHED");
}

function providerId(value: unknown): string | null {
  const parsed = z.object({ id: z.union([z.string(), z.number()]).optional() }).passthrough().safeParse(value);
  return parsed.success && parsed.data.id !== undefined ? String(parsed.data.id) : null;
}

export async function enqueueResearch(input: { leadId: string; campaignId: string; idempotencyKey: string; automationRunId?: string; assessmentId?: string }) {
  const organizationId = currentOrganization();
  return prisma.$transaction(async tx => {
    const existing = await tx.agentJob.findUnique({ where: { organizationId_idempotencyKey: { organizationId, idempotencyKey: input.idempotencyKey } } });
    if (existing) return existing;
    const lead = await tx.lead.update({ where: { id: input.leadId, organizationId }, data: { agentVersion: { increment: 1 } }, select: { agentVersion: true } }).catch(() => null);
    if (!lead) throw ApiError.notFound("Lead not found");
    const campaign = await tx.campaign.findFirst({ where: { id: input.campaignId, organizationId }, select: { id: true } });
    if (!campaign) throw ApiError.notFound("Campaign not found");
    return tx.agentJob.create({ data: { organizationId, leadId: input.leadId, automationRunId: input.automationRunId, assessmentId: input.assessmentId, type: "RESEARCH", idempotencyKey: input.idempotencyKey, inputJson: json({ campaignId: campaign.id, version: lead.agentVersion }) } });
  });
}

async function enqueueOutreach(input: { leadId: string; qualificationId: string; recipientEmail: string | null; recipientName: string | null; idempotencyKey: string; assessmentId?: string; runAfter?: Date }) {
  const organizationId = currentOrganization();
  return prisma.$transaction(async tx => {
    const existing = await tx.agentJob.findUnique({ where: { organizationId_idempotencyKey: { organizationId, idempotencyKey: input.idempotencyKey } } });
    if (existing) return existing;
    const lead = await tx.lead.update({ where: { id: input.leadId, organizationId }, data: { agentVersion: { increment: 1 } }, select: { agentVersion: true } });
    return tx.agentJob.create({ data: { organizationId, leadId: input.leadId, assessmentId: input.assessmentId, type: "OUTREACH", idempotencyKey: input.idempotencyKey, runAfter: input.runAfter, inputJson: json({ qualificationId: input.qualificationId, version: lead.agentVersion, recipientEmail: input.recipientEmail, recipientName: input.recipientName }) } });
  });
}

async function executeResearch(job: AgentJob) {
  if (!job.leadId) throw new Error("LEAD_REQUIRED");
  const input = researchJobInputSchema.parse(job.inputJson);
  const lead = await prisma.lead.findFirst({ where: { id: job.leadId, organizationId: job.organizationId }, include: { reviews: { orderBy: { createdAt: "desc" }, take: 10 } } });
  if (!lead) throw new Error("LEAD_NOT_FOUND");
  const observedAt = lead.updatedAt.toISOString();
  const googleUrl = safeSourceUrl(lead.googleMapsUrl);
  const websiteUrl = safeSourceUrl(lead.website);
  const evidence: ResearchInput["evidence"] = [
    { id: "name", fact: `Business name: ${lead.name}`, sourceUrl: googleUrl, observedAt, sourceType: "GOOGLE_PLACES" },
    { id: "category", fact: `Category: ${lead.category ?? "unknown"}`, sourceUrl: googleUrl, observedAt, sourceType: "GOOGLE_PLACES" },
    { id: "address", fact: `Address: ${lead.address ?? "unknown"}`, sourceUrl: googleUrl, observedAt, sourceType: "GOOGLE_PLACES" },
    { id: "website", fact: `Website reported by source: ${lead.website ?? "not provided"}`, sourceUrl: websiteUrl ?? googleUrl, observedAt, sourceType: "GOOGLE_PLACES" },
    { id: "phone", fact: `Phone reported by source: ${lead.phone ?? "not provided"}`, sourceUrl: googleUrl, observedAt, sourceType: "GOOGLE_PLACES" },
    { id: "rating", fact: `Rating: ${lead.rating ?? "unknown"}; review count: ${lead.reviewCount}`, sourceUrl: googleUrl, observedAt, sourceType: "GOOGLE_PLACES" },
    ...lead.reviews.filter(review => review.comment).map((review, index) => ({ id: `review_${index}`, fact: `Reviewer opinion: ${review.comment!.slice(0, 1500)}`, sourceUrl: googleUrl, observedAt: (review.publishedAt ?? review.createdAt).toISOString(), sourceType: "CUSTOMER_REVIEW" as const })),
  ];
  const output = await runResearchAgent(job, { leadId: lead.id, name: lead.name, category: lead.category, address: lead.address, website: websiteUrl, phone: lead.phone, rating: lead.rating, reviewCount: lead.reviewCount, businessStatus: lead.businessStatus, evidence });
  const research = await prisma.leadResearch.create({ data: { organizationId: job.organizationId, leadId: lead.id, jobId: job.id, version: input.version, summary: output.summary, signals: json(output.signals), evidence: json(evidence.filter(item => output.evidenceIds.includes(item.id))), missingFields: json(output.missingFields), confidence: output.confidence } });
  await agentJobRepository.enqueue({ organizationId: job.organizationId, leadId: lead.id, automationRunId: job.automationRunId ?? undefined, assessmentId: job.assessmentId ?? undefined, type: "QUALIFICATION", idempotencyKey: `qualification:${research.id}`, input: json({ campaignId: input.campaignId, researchId: research.id, version: input.version }) });
  if (websiteUrl) await agentJobRepository.enqueue({ organizationId: job.organizationId, leadId: lead.id, automationRunId: job.automationRunId ?? undefined, assessmentId: job.assessmentId ?? undefined, type: "CONTACT_ENRICHMENT", idempotencyKey: `enrichment:${research.id}`, input: json({ version: input.version }) });
}

async function executeQualification(job: AgentJob) {
  if (!job.leadId) throw new Error("LEAD_REQUIRED");
  const input = qualificationJobInputSchema.parse(job.inputJson);
  const [{ config }, lead, research] = await Promise.all([
    campaignForJob(job, input.campaignId),
    prisma.lead.findFirst({ where: { id: job.leadId, organizationId: job.organizationId } }),
    prisma.leadResearch.findFirst({ where: { id: input.researchId, organizationId: job.organizationId } }),
  ]);
  if (!lead || !research) throw new Error("QUALIFICATION_INPUT_NOT_FOUND");
  const output = await runQualificationAgent(job, { leadId: lead.id, applicationScore: lead.leadScore, minimumScore: config.minimumScore, businessStatus: lead.businessStatus, criteria: config.qualificationCriteria, research: { summary: research.summary, signals: z.array(z.any()).parse(research.signals), evidenceIds: z.array(z.string()).parse(z.array(z.object({ id: z.string() })).parse(research.evidence).map(item => item.id)), missingFields: z.array(z.string()).parse(research.missingFields), confidence: research.confidence } });
  const qualification = await prisma.leadQualification.create({ data: { organizationId: job.organizationId, leadId: lead.id, researchId: research.id, jobId: job.id, version: input.version, score: output.score, fit: output.fit, reasons: json(output.reasons), risks: json(output.risks), recommendedAction: output.recommendedAction, confidence: output.confidence, rubricVersion: "qualification-v1" } });
  if (job.assessmentId) await prisma.leadAssessment.updateMany({ where: { id: job.assessmentId, leadId: lead.id }, data: { status: output.recommendedAction === "REJECT" ? "REJECTED" : "REVIEW", decision: output.recommendedAction, reason: output.reasons.join(" "), evidence: json(research.evidence), source: env.AI_PROVIDER, subject: null, body: null } });
  if (config.mode === "AUTO_SEND" && output.recommendedAction === "APPROVE_FOR_OUTREACH" && output.confidence >= config.minQualificationConfidence && job.assessmentId) {
    await enqueueOutreach({
      leadId: lead.id,
      qualificationId: qualification.id,
      recipientEmail: null,
      recipientName: null,
      assessmentId: job.assessmentId,
      idempotencyKey: `auto-outreach:${qualification.id}`,
      runAfter: new Date(Date.now() + 30_000),
    });
  }
  return qualification;
}

async function executeEnrichment(job: AgentJob) {
  if (!job.leadId) throw new Error("LEAD_REQUIRED");
  enrichmentJobInputSchema.parse(job.inputJson);
  const lead = await prisma.lead.findFirst({ where: { id: job.leadId, organizationId: job.organizationId } });
  if (!lead?.website) return;
  const domain = new URL(lead.website).hostname.replace(/^www\./, "");
  const candidates = await findContacts(domain);
  const output = await runContactEnrichmentAgent(job, { leadId: lead.id, companyName: lead.name, domain, candidates });
  await Promise.all(output.contacts.map(contact => prisma.leadContact.upsert({ where: { organizationId_leadId_email: { organizationId: job.organizationId, leadId: lead.id, email: normalizedEmail(contact.email) } }, update: { name: contact.name, role: contact.role, confidence: contact.confidence, verificationStatus: contact.verificationStatus, jobId: job.id }, create: { organizationId: job.organizationId, leadId: lead.id, jobId: job.id, name: contact.name, email: normalizedEmail(contact.email), role: contact.role, source: "HUNTER", confidence: contact.confidence, verificationStatus: contact.verificationStatus } })));
}

async function executeOutreach(job: AgentJob) {
  if (!job.leadId) throw new Error("LEAD_REQUIRED");
  const input = outreachJobInputSchema.parse(job.inputJson);
  const qualification = await prisma.leadQualification.findFirst({ where: { id: input.qualificationId, organizationId: job.organizationId }, include: { research: true, lead: true } });
  if (!qualification) throw new Error("QUALIFICATION_NOT_FOUND");
  const assessment = job.assessmentId ? await prisma.leadAssessment.findUnique({ where: { id: job.assessmentId }, include: { run: { include: { campaign: true } } } }) : null;
  if (!assessment) throw new Error("ASSESSMENT_REQUIRED");
  const config = campaignConfigSchema.parse(assessment.run.config);
  const leadApproval = await prisma.leadApproval.findUnique({ where: { organizationId_leadId_stage_version: { organizationId: job.organizationId, leadId: job.leadId, stage: "LEAD", version: qualification.version } } });
  if (config.mode === "AUTO_SEND") {
    if (qualification.recommendedAction !== "APPROVE_FOR_OUTREACH" || qualification.confidence < config.minQualificationConfidence) throw new Error("AUTO_SEND_NOT_ELIGIBLE");
    if (leadApproval?.decision === "REJECTED") throw new Error("LEAD_REJECTED");
    if (!leadApproval) {
      await prisma.leadApproval.upsert({
        where: { organizationId_leadId_stage_version: { organizationId: job.organizationId, leadId: job.leadId, stage: "LEAD", version: qualification.version } },
        update: {},
        create: { organizationId: job.organizationId, leadId: job.leadId, stage: "LEAD", version: qualification.version, decision: "APPROVED", userId: "worker", note: "Automatically approved by the configured campaign policy." },
      });
    }
  } else if (leadApproval?.decision !== "APPROVED") {
    throw new Error("LEAD_APPROVAL_REQUIRED");
  }
  const selectedRecipient = input.recipientEmail
    ? { email: normalizedEmail(input.recipientEmail), name: input.recipientName }
    : config.mode === "AUTO_SEND"
      ? await selectCampaignRecipient(job.organizationId, job.leadId, config)
      : { email: null, name: input.recipientName };
  const evidence = z.array(z.object({ id: z.string(), fact: z.string(), sourceUrl: z.string().nullable(), observedAt: z.string(), sourceType: z.enum(["GOOGLE_PLACES", "BUSINESS_WEBSITE", "CUSTOMER_REVIEW", "APPLICATION"]) })).parse(qualification.research.evidence);
  const output = await runOutreachAgent(job, { leadId: job.leadId, companyName: qualification.lead.name, recipientEmail: selectedRecipient.email, recipientName: selectedRecipient.name, senderName: config.senderName, offer: config.offer, qualification: { score: qualification.score, fit: qualification.fit, reasons: z.array(z.string()).parse(qualification.reasons), risks: z.array(z.string()).parse(qualification.risks), recommendedAction: z.enum(["REJECT", "REVIEW", "APPROVE_FOR_OUTREACH"]).parse(qualification.recommendedAction), confidence: qualification.confidence }, evidence });
  const draft = await prisma.outreachDraft.create({ data: { organizationId: job.organizationId, leadId: job.leadId, qualificationId: qualification.id, jobId: job.id, recipientEmail: selectedRecipient.email, recipientName: selectedRecipient.name, subject: output.subject, body: output.body, personalizationEvidenceIds: json(output.personalizationEvidenceIds), version: input.version, status: config.mode === "AUTO_SEND" ? "APPROVED" : "REVIEW", approvedBy: config.mode === "AUTO_SEND" ? "worker" : null, approvedAt: config.mode === "AUTO_SEND" ? new Date() : null } });
  if (job.assessmentId) await prisma.leadAssessment.update({ where: { id: job.assessmentId }, data: { subject: draft.subject, body: draft.body, version: draft.version, status: config.mode === "AUTO_SEND" ? "APPROVED" : "REVIEW", approvedAt: config.mode === "AUTO_SEND" ? new Date() : null, approvedBy: config.mode === "AUTO_SEND" ? "worker" : null } });
  if (config.mode === "AUTO_SEND") {
    await prisma.leadApproval.upsert({
      where: { organizationId_leadId_stage_version: { organizationId: job.organizationId, leadId: job.leadId, stage: "OUTREACH", version: draft.version } },
      update: {},
      create: { organizationId: job.organizationId, leadId: job.leadId, stage: "OUTREACH", version: draft.version, decision: "APPROVED", userId: "worker", note: "Automatically approved by the configured campaign policy." },
    });
    await sendApprovedDraft(draft.id, `auto-send:${draft.id}:${draft.version}`);
  }
}

async function executeFollowUp(job: AgentJob) {
  if (!job.leadId) throw new Error("LEAD_REQUIRED");
  const input = followUpJobInputSchema.parse(job.inputJson);
  const draft = await prisma.outreachDraft.findFirst({ where: { id: input.draftId, leadId: job.leadId, organizationId: job.organizationId, status: "SENT" }, include: { lead: true, events: { where: { eventType: "SENT" }, orderBy: { occurredAt: "desc" }, take: 1 }, job: { include: { assessment: { include: { run: true } } } } } });
  if (!draft?.events[0] || !draft.job.assessment) throw new Error("SENT_DRAFT_REQUIRED");
  const config = campaignConfigSchema.parse(draft.job.assessment.run.config);
  const output = await runFollowUpAgent(job, { leadId: job.leadId, companyName: draft.lead.name, originalSubject: draft.subject, originalBody: draft.body, sentAt: draft.events[0].occurredAt.toISOString(), senderName: config.senderName });
  await prisma.followUpPlan.create({ data: { organizationId: job.organizationId, leadId: job.leadId, draftId: draft.id, jobId: job.id, version: input.version, waitHours: output.waitHours, dueAt: new Date(draft.events[0].occurredAt.getTime() + output.waitHours * 3_600_000), subject: output.subject, body: output.body, reason: output.reason, status: config.mode === "AUTO_SEND" && config.followUpEnabled ? "APPROVED" : "PROPOSED" } });
}

async function executeAnalytics(job: AgentJob) {
  const input = analyticsJobInputSchema.parse(job.inputJson);
  const periodStart = new Date(input.periodStart); const periodEnd = new Date(input.periodEnd);
  const [leads, qualified, drafts, sent, failed] = await Promise.all([
    prisma.lead.count({ where: { organizationId: job.organizationId, createdAt: { gte: periodStart, lte: periodEnd } } }),
    prisma.leadQualification.count({ where: { organizationId: job.organizationId, createdAt: { gte: periodStart, lte: periodEnd }, fit: "HIGH" } }),
    prisma.outreachDraft.count({ where: { organizationId: job.organizationId, createdAt: { gte: periodStart, lte: periodEnd } } }),
    prisma.outreachEvent.count({ where: { organizationId: job.organizationId, occurredAt: { gte: periodStart, lte: periodEnd }, eventType: "SENT" } }),
    prisma.agentJob.count({ where: { organizationId: job.organizationId, createdAt: { gte: periodStart, lte: periodEnd }, status: "FAILED" } }),
  ]);
  const metrics = { leads, qualified, drafts, sent, failed };
  const output = await runAnalyticsAgent(job, { periodStart: input.periodStart, periodEnd: input.periodEnd, metrics });
  await prisma.analyticsInsight.create({ data: { organizationId: job.organizationId, campaignId: input.campaignId, jobId: job.id, periodStart, periodEnd, summary: output.summary, metricsJson: json(metrics), recommendations: json(output.recommendations) } });
}

export async function executeAgentJob(job: AgentJob) {
  if (job.automationRunId && env.AI_PROVIDER === "nvidia") {
    const run = await prisma.automationRun.findUnique({ where: { id: job.automationRunId } });
    if (!run) throw new Error("PARENT_RUN_NOT_FOUND");
    const limit = campaignConfigSchema.parse(run.config).maxAiCalls;
    const reserved = await prisma.automationRun.updateMany({ where: { id: run.id, aiCalls: { lt: limit } }, data: { aiCalls: { increment: 1 } } });
    if (!reserved.count) throw new Error("AI_BUDGET_EXHAUSTED");
  }
  switch (job.type) {
    case "RESEARCH": return executeResearch(job);
    case "QUALIFICATION": return executeQualification(job);
    case "CONTACT_ENRICHMENT": return executeEnrichment(job);
    case "OUTREACH": return executeOutreach(job);
    case "FOLLOW_UP": return executeFollowUp(job);
    case "ANALYTICS": return executeAnalytics(job);
  }
}

export async function approveLead(input: { assessmentId: string; version: number; decision: "APPROVED" | "REJECTED"; note?: string; recipientEmail?: string | null; recipientName?: string | null }) {
  const organizationId = currentOrganization();
  const assessment = await prisma.leadAssessment.findFirst({ where: { id: input.assessmentId, run: { campaign: { organizationId } } }, include: { run: true } });
  if (!assessment) throw ApiError.notFound("Assessment not found");
  const qualification = await prisma.leadQualification.findFirst({ where: { leadId: assessment.leadId, organizationId }, orderBy: { createdAt: "desc" } });
  if (!qualification || qualification.version !== input.version) throw new ApiError(409, "Qualification changed. Reload before reviewing.");
  await prisma.$transaction(async tx => {
    await tx.leadApproval.create({ data: { organizationId, leadId: assessment.leadId, stage: "LEAD", version: qualification.version, decision: input.decision, userId: authContext.getStore()!.userId, note: input.note } });
    await tx.leadAssessment.update({ where: { id: assessment.id }, data: { status: input.decision === "APPROVED" ? "APPROVED" : "REJECTED", approvedBy: input.decision === "APPROVED" ? authContext.getStore()!.userId : null, approvedAt: input.decision === "APPROVED" ? new Date() : null } });
  }).catch(error => { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ApiError(409, "This qualification version has already been reviewed."); throw error; });
  if (input.decision === "APPROVED") return enqueueOutreach({ leadId: assessment.leadId, qualificationId: qualification.id, recipientEmail: input.recipientEmail ?? null, recipientName: input.recipientName ?? null, assessmentId: assessment.id, idempotencyKey: `outreach:${assessment.id}:${qualification.version}` });
  return null;
}

export async function approveDraft(input: { draftId: string; version: number; decision: "APPROVED" | "REJECTED"; note?: string }) {
  const organizationId = currentOrganization();
  const status = input.decision === "APPROVED" ? "APPROVED" : "REJECTED";
  const draft = await prisma.outreachDraft.findFirst({ where: { id: input.draftId, organizationId } });
  if (!draft) throw ApiError.notFound("Draft not found");
  if (draft.version !== input.version || draft.status !== "REVIEW") throw new ApiError(409, "Draft changed or is no longer awaiting review.");
  if (input.decision === "APPROVED" && !draft.recipientEmail) throw new ApiError(422, "Add a verified recipient email before approval.");
  await prisma.$transaction([
    prisma.outreachDraft.update({ where: { id: draft.id }, data: { status, approvedBy: input.decision === "APPROVED" ? authContext.getStore()!.userId : null, approvedAt: input.decision === "APPROVED" ? new Date() : null } }),
    prisma.leadApproval.create({ data: { organizationId, leadId: draft.leadId, stage: "OUTREACH", version: draft.version, decision: input.decision, userId: authContext.getStore()!.userId, note: input.note } }),
  ]).catch(error => { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ApiError(409, "This draft version has already been reviewed."); throw error; });
}

export async function updateDraft(input: { draftId: string; version: number; subject: string; body: string; recipientEmail: string; recipientName?: string | null }) {
  const organizationId = currentOrganization();
  const draft = await prisma.outreachDraft.findFirst({ where: { id: input.draftId, organizationId } });
  if (!draft) throw ApiError.notFound("Draft not found");
  if (draft.version !== input.version || draft.status === "SENT") throw new ApiError(409, "Draft changed or has already been sent.");
  const lead = await prisma.lead.update({ where: { id: draft.leadId, organizationId }, data: { agentVersion: { increment: 1 } }, select: { agentVersion: true } });
  return prisma.outreachDraft.update({ where: { id: draft.id }, data: { subject: input.subject, body: input.body, recipientEmail: normalizedEmail(input.recipientEmail), recipientName: input.recipientName, version: lead.agentVersion, status: "REVIEW", approvedAt: null, approvedBy: null } });
}

export async function sendApprovedDraft(draftId: string, idempotencyKey: string) {
  if (!env.OUTREACH_ENABLED) throw new ApiError(403, "Outbound sending is disabled.");
  const organizationId = currentOrganization();
  const draft = await prisma.outreachDraft.findFirst({ where: { id: draftId, organizationId }, include: { lead: true, job: { include: { assessment: { include: { run: { include: { campaign: true } } } } } } } });
  if (!draft?.recipientEmail) throw new ApiError(422, "Draft and recipient are required.");
  if (draft.status !== "APPROVED") throw new ApiError(409, "The exact draft version must be approved before sending.");
  const assessment = draft.job.assessment;
  if (!assessment) throw new ApiError(409, "The draft is missing its campaign context.");
  const config = campaignConfigSchema.parse(assessment.run.config);
  const recipient = normalizedEmail(draft.recipientEmail);
  const [approval, suppression] = await Promise.all([
    prisma.leadApproval.findUnique({ where: { organizationId_leadId_stage_version: { organizationId, leadId: draft.leadId, stage: "OUTREACH", version: draft.version } } }),
    prisma.leadSuppression.findUnique({ where: { organizationId_normalizedContact: { organizationId, normalizedContact: recipient } } }),
  ]);
  if (approval?.decision !== "APPROVED") throw new ApiError(409, "Draft approval is missing or stale.");
  if (suppression?.active) throw new ApiError(403, "This recipient is suppressed.");
  const existing = await prisma.outreachEvent.findUnique({ where: { organizationId_idempotencyKey: { organizationId, idempotencyKey } } });
  if (existing) return existing;
  await assertSendPolicy(organizationId, assessment.run.campaignId, config);
  const pending = await prisma.outreachEvent.create({ data: { organizationId, leadId: draft.leadId, draftId: draft.id, idempotencyKey, provider: "HUNTER", eventType: "PENDING" } });
  try {
    const providerResult = await sendEmail({ to: recipient, subject: draft.subject, body: draft.body, idempotencyKey });
    const payload = json(providerResult);
    const event = await prisma.outreachEvent.update({ where: { id: pending.id }, data: { eventType: "SENT", providerId: providerId(providerResult), payloadJson: payload, occurredAt: new Date() } });
    await prisma.outreachDraft.update({ where: { id: draft.id }, data: { status: "SENT" } });
    if (config.followUpEnabled) {
      await agentJobRepository.enqueue({ organizationId, leadId: draft.leadId, type: "FOLLOW_UP", idempotencyKey: `follow-up:${draft.id}:${draft.version}`, input: json({ draftId: draft.id, version: draft.version }) });
    }
    return event;
  } catch (error) {
    const ambiguous = error instanceof ApiError && error.statusCode >= 500;
    await prisma.outreachEvent.update({ where: { id: pending.id }, data: { eventType: ambiguous ? "UNKNOWN" : "FAILED", occurredAt: new Date() } });
    throw error;
  }
}

export async function sendFollowUpPlan(planId: string, idempotencyKey: string) {
  if (!env.OUTREACH_ENABLED) throw new ApiError(403, "Outbound sending is disabled.");
  const organizationId = currentOrganization();
  const plan = await prisma.followUpPlan.findFirst({ where: { id: planId, organizationId }, include: { draft: { include: { job: { include: { assessment: { include: { run: true } } } } } } } });
  if (!plan) throw ApiError.notFound("Follow-up plan not found");
  if (plan.status !== "APPROVED" || plan.dueAt > new Date()) throw new ApiError(409, "Follow-up is not due or approved.");
  const assessment = plan.draft.job.assessment;
  if (!assessment) throw new ApiError(409, "The follow-up is missing its campaign context.");
  const config = campaignConfigSchema.parse(assessment.run.config);
  const recipient = normalizedEmail(plan.draft.recipientEmail || "");
  if (!recipient) throw new ApiError(422, "Follow-up recipient is missing.");
  const suppression = await prisma.leadSuppression.findUnique({ where: { organizationId_normalizedContact: { organizationId, normalizedContact: recipient } } });
  if (suppression?.active) {
    await prisma.followUpPlan.update({ where: { id: plan.id }, data: { status: "CANCELLED" } });
    throw new ApiError(403, "This recipient is suppressed.");
  }
  const existing = await prisma.outreachEvent.findUnique({ where: { organizationId_idempotencyKey: { organizationId, idempotencyKey } } });
  if (existing) return existing;
  await assertSendPolicy(organizationId, assessment.run.campaignId, config);
  const pending = await prisma.outreachEvent.create({ data: { organizationId, leadId: plan.leadId, draftId: plan.draftId, idempotencyKey, provider: "HUNTER", eventType: "FOLLOW_UP_PENDING" } });
  try {
    const providerResult = await sendEmail({ to: recipient, subject: plan.subject, body: plan.body, idempotencyKey });
    const event = await prisma.outreachEvent.update({ where: { id: pending.id }, data: { eventType: "FOLLOW_UP_SENT", providerId: providerId(providerResult), payloadJson: json(providerResult), occurredAt: new Date() } });
    await prisma.followUpPlan.update({ where: { id: plan.id }, data: { status: "COMPLETED" } });
    return event;
  } catch (error) {
    const ambiguous = error instanceof ApiError && error.statusCode >= 500;
    await prisma.outreachEvent.update({ where: { id: pending.id }, data: { eventType: ambiguous ? "FOLLOW_UP_UNKNOWN" : "FOLLOW_UP_FAILED", occurredAt: new Date() } });
    throw error;
  }
}

export async function processDueFollowUps() {
  if (!env.OUTREACH_ENABLED) return 0;
  const plans = await prisma.followUpPlan.findMany({ where: { status: "APPROVED", dueAt: { lte: new Date() } }, orderBy: { dueAt: "asc" }, take: 20 });
  let processed = 0;
  for (const plan of plans) {
    try {
      await authContext.run({ organizationId: plan.organizationId, userId: "worker", role: "ADMIN" }, () => sendFollowUpPlan(plan.id, `follow-up-send:${plan.id}:${plan.version}`));
      processed += 1;
    } catch (error) {
      console.error(JSON.stringify({ event: "follow_up_send_failed", planId: plan.id, error: error instanceof Error ? error.message : "UNKNOWN" }));
    }
  }
  return processed;
}

export async function suppressContact(normalizedContact: string, reason: string) {
  const organizationId = currentOrganization();
  const contact = normalizedEmail(normalizedContact);
  const suppression = await prisma.leadSuppression.upsert({ where: { organizationId_normalizedContact: { organizationId, normalizedContact: contact } }, update: { active: true, reason, source: "USER" }, create: { organizationId, normalizedContact: contact, reason, source: "USER" } });
  await prisma.followUpPlan.updateMany({ where: { organizationId, draft: { recipientEmail: contact }, status: { in: ["PROPOSED", "APPROVED"] } }, data: { status: "CANCELLED" } });
  return suppression;
}

export async function getLeadAgentSummary(leadId: string) {
  const organizationId = currentOrganization();
  const lead = await prisma.lead.findFirst({ where: { id: leadId, organizationId }, include: { researchSnapshots: { orderBy: { version: "desc" }, take: 1 }, qualifications: { orderBy: { version: "desc" }, take: 1 }, contacts: { orderBy: { confidence: "desc" }, take: 10 }, outreachDrafts: { orderBy: { version: "desc" }, take: 1 }, followUpPlans: { orderBy: { version: "desc" }, take: 1 }, agentJobs: { orderBy: { createdAt: "desc" }, take: 20, include: { runs: { orderBy: { createdAt: "desc" }, take: 1 } } } } });
  if (!lead) throw ApiError.notFound("Lead not found");
  return lead;
}

export async function finalizeParentRun(job: AgentJob) {
  if (!job.automationRunId) return;
  const active = await prisma.agentJob.count({ where: { automationRunId: job.automationRunId, status: { in: ["QUEUED", "RUNNING"] } } });
  if (!active) {
    await prisma.$transaction(async tx => {
      const changed = await tx.automationRun.updateMany({ where: { id: job.automationRunId!, status: "WAITING" }, data: { status: "COMPLETED", stage: "REVIEW", finishedAt: new Date() } });
      if (changed.count) await tx.runEvent.create({ data: { runId: job.automationRunId!, type: "AGENTS_COMPLETED", message: "Research and qualification jobs completed. Leads are ready for review." } });
    });
  }
}

export async function enqueueAnalytics(input: { campaignId: string | null; periodStart: Date; periodEnd: Date; idempotencyKey: string }) {
  return agentJobRepository.enqueue({ type: "ANALYTICS", idempotencyKey: input.idempotencyKey, input: json({ campaignId: input.campaignId, periodStart: input.periodStart.toISOString(), periodEnd: input.periodEnd.toISOString() }) });
}
