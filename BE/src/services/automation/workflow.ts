import type { AutomationRun, Campaign, Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "../../config/database";
import { runRepository } from "../../repositories/run.repository";
import { leadRepository } from "../../repositories/lead.repository";
import { searchPlaces, getPlaceDetails, normalizePlace } from "../google-places.service";
import { calculateLeadScore } from "../lead-scoring.service";
import { detectOpportunities, opportunitySummary } from "../opportunity.service";
import { campaignConfigSchema } from "../../validators/campaign.validator";
import { enqueueResearch } from "../agents/agent-workflow.service";
import { BudgetExceeded, RunStopped } from "./policy";
import { currentOrganization } from "../../auth/context";

const candidateSchema = z.array(z.string().min(1).max(255)).max(20);
export async function executeWorkflow(run: AutomationRun & { campaign: Campaign }) {
  const config = campaignConfigSchema.parse(run.config);
  const token = run.leaseToken!;
  const fence = <T>(operation: (tx: Prisma.TransactionClient) => Promise<T>) => runRepository.fenced(run.id, token, operation);
  const reserveGoogle = () => runRepository.reserveCall(run.id, token, "googleCalls", config.maxGoogleCalls);

  if (!run.searchId) {
    run.searchId = await fence(async tx => {
      const search = await tx.leadSearch.create({ data: { organizationId: currentOrganization(), keyword: config.keyword, location: config.location, websiteFilter: config.website, requestedCount: config.limit, status: "PROCESSING" } });
      await tx.automationRun.update({ where: { id: run.id }, data: { searchId: search.id, events: { create: { type: "DISCOVERY", message: "Searching Google Places for campaign targets" } } } });
      return search.id;
    });
  }
  let candidates: string[];
  if (run.discoveryData === null) {
    await reserveGoogle();
    const response = await searchPlaces(`${config.keyword} in ${config.location}`, config.limit);
    candidates = [...new Set((response.places ?? []).map(place => place.id).filter((id): id is string => !!id))].slice(0, config.limit);
    await fence(tx => tx.automationRun.update({ where: { id: run.id }, data: { discoveryData: candidates } }));
  } else candidates = candidateSchema.parse(run.discoveryData);

  for (const placeId of candidates) {
    await fence(async () => undefined);
    const enrolled = await prisma.searchLead.findFirst({ where: { searchId: run.searchId, lead: { organizationId: currentOrganization(), placeId } } });
    if (enrolled) continue;
    await reserveGoogle();
    const normalized = normalizePlace(await getPlaceDetails(placeId));
    if (!normalized.placeId) throw new Error("INVALID_PLACE_RESPONSE");
    const score = calculateLeadScore(normalized);
    const opportunities = opportunitySummary(detectOpportunities(normalized));
    // Upsert is scoped and repeatable. Enrollment is committed under the run lease below.
    const { reviews, ...fields } = normalized;
    const lead = await leadRepository.upsertLead({ ...fields, websiteExists: !!normalized.website, leadScore: score, opportunitySummary: opportunities });
    const matches = (config.website === "ANY" || (config.website === "HAS_WEBSITE") === !!normalized.website);
    await fence(async tx => {
      if (reviews?.length) {
        await tx.review.deleteMany({ where: { leadId: lead.id } });
        await tx.review.createMany({ data: reviews.map(review => ({ ...review, leadId: lead.id })) });
      }
      await tx.searchLead.upsert({ where: { searchId_leadId: { searchId: run.searchId!, leadId: lead.id } }, create: { searchId: run.searchId!, leadId: lead.id }, update: {} });
      if (matches) await tx.leadAssessment.upsert({ where: { runId_leadId: { runId: run.id, leadId: lead.id } }, create: { runId: run.id, leadId: lead.id }, update: {} });
    });
  }
  await fence(async tx => {
    await tx.leadSearch.update({ where: { id: run.searchId! }, data: { status: "COMPLETED", resultCount: await tx.searchLead.count({ where: { searchId: run.searchId! } }) } });
    await tx.automationRun.update({ where: { id: run.id }, data: { stage: "QUALIFICATION", events: { create: { type: "QUALIFICATION", message: "Assessing discovered businesses and preparing reviewable drafts" } } } });
  });

  const pending = await prisma.leadAssessment.findMany({ where: { runId: run.id, status: "PENDING" } });
  for (const assessment of pending) {
    await fence(async () => undefined);
    await enqueueResearch({ leadId: assessment.leadId, campaignId: run.campaignId, automationRunId: run.id, assessmentId: assessment.id, idempotencyKey: `research:${assessment.id}:1` });
  }
  await fence(async tx => {
    await tx.automationRun.update({ where: { id: run.id }, data: pending.length ? { status: "WAITING", stage: "RESEARCH", leaseToken: null, leaseUntil: null, events: { create: { type: "AGENTS_QUEUED", message: `${pending.length} leads queued for research and qualification.` } } } : { status: "COMPLETED", stage: "REVIEW", finishedAt: new Date(), leaseToken: null, leaseUntil: null } });
  });
}
