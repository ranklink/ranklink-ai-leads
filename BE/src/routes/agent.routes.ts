import { Router } from "express";
import prisma from "../config/database";
import { currentOrganization } from "../auth/context";
import { asyncHandler } from "../utils/async-handler";
import { ApiError } from "../utils/api-error";
import { analyticsJobSchema, draftReviewSchema, draftUpdateSchema, idempotencyKeySchema, leadReviewSchema, queueResearchSchema, suppressionSchema } from "../validators/agent.validator";
import { approveDraft, approveLead, enqueueAnalytics, enqueueResearch, getLeadAgentSummary, sendApprovedDraft, suppressContact, updateDraft } from "../services/agents/agent-workflow.service";

const router = Router();
const requestKey = (header: string | undefined) => idempotencyKeySchema.parse(header);

router.post("/leads/:id/agents/research", asyncHandler(async (req, res) => {
  const input = queueResearchSchema.parse(req.body);
  const job = await enqueueResearch({ leadId: req.params.id, campaignId: input.campaignId, idempotencyKey: requestKey(req.headers["idempotency-key"] as string | undefined) });
  res.status(202).json({ success: true, data: { id: job.id, status: job.status } });
}));

router.get("/leads/:id/agent-summary", asyncHandler(async (req, res) => res.json({ success: true, data: await getLeadAgentSummary(req.params.id) })));

router.get("/agent-jobs/:id", asyncHandler(async (req, res) => {
  const job = await prisma.agentJob.findFirst({ where: { id: req.params.id, organizationId: currentOrganization() }, include: { runs: { orderBy: { createdAt: "desc" }, take: 10 } } });
  if (!job) throw ApiError.notFound("Agent job not found");
  const { leaseToken: _leaseToken, inputJson: _inputJson, ...safeJob } = job;
  res.json({ success: true, data: safeJob });
}));

router.post("/assessments/:id/review", asyncHandler(async (req, res) => {
  const input = leadReviewSchema.parse(req.body);
  const job = await approveLead({ assessmentId: req.params.id, ...input });
  res.status(job ? 202 : 200).json({ success: true, data: job ? { id: job.id, status: job.status } : null });
}));

router.patch("/agent-drafts/:id", asyncHandler(async (req, res) => {
  const input = draftUpdateSchema.parse(req.body);
  res.json({ success: true, data: await updateDraft({ draftId: req.params.id, ...input }) });
}));

router.post("/agent-drafts/:id/review", asyncHandler(async (req, res) => {
  const input = draftReviewSchema.parse(req.body);
  await approveDraft({ draftId: req.params.id, ...input });
  res.json({ success: true });
}));

router.post("/agent-drafts/:id/send", asyncHandler(async (req, res) => {
  const event = await sendApprovedDraft(req.params.id, requestKey(req.headers["idempotency-key"] as string | undefined));
  res.status(event.eventType === "SENT" ? 201 : 200).json({ success: true, data: event });
}));

router.post("/suppressions", asyncHandler(async (req, res) => {
  const input = suppressionSchema.parse(req.body);
  res.status(201).json({ success: true, data: await suppressContact(input.contact, input.reason) });
}));

router.post("/analytics/agent-jobs", asyncHandler(async (req, res) => {
  const input = analyticsJobSchema.parse(req.body);
  const job = await enqueueAnalytics({ ...input, idempotencyKey: requestKey(req.headers["idempotency-key"] as string | undefined) });
  res.status(202).json({ success: true, data: { id: job.id, status: job.status } });
}));

export default router;

