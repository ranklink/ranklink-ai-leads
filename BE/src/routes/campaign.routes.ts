import { Router } from "express";
import { z } from "zod";
import { campaignRepository } from "../repositories/campaign.repository";
import { runRepository } from "../repositories/run.repository";
import { campaignConfigSchema, createCampaignSchema, updateCampaignSchema, pageSchema, draftReviewSchema } from "../validators/campaign.validator";
import { asyncHandler } from "../utils/async-handler";
import { env } from "../config/env";
import { approveLead } from "../services/agents/agent-workflow.service";
import { ApiError } from "../utils/api-error";

const router = Router();
router.get("/automation/configuration", (_req, res) => {
  const aiConfigured = env.AI_PROVIDER === "nvidia" && Boolean(env.NVIDIA_API_KEY);
  const googleConfigured = Boolean(env.GOOGLE_PLACES_API_KEY) && env.GOOGLE_PLACES_API_KEY !== "your_google_key";
  const hunterConfigured = Boolean(env.HUNTER_API_KEY);
  const hunterMailboxConfigured = hunterConfigured && Boolean(env.HUNTER_EMAIL_ACCOUNT_ID);
  const outboundConfigured = env.OUTREACH_ENABLED && hunterMailboxConfigured;
  const outboundBlockers = [
    ...(env.OUTREACH_ENABLED ? [] : ["Outbound sending is disabled on the backend."]),
    ...(hunterConfigured ? [] : ["HUNTER_API_KEY is not configured."]),
    ...(env.HUNTER_EMAIL_ACCOUNT_ID ? [] : ["Connect a sending mailbox in Hunter and set HUNTER_EMAIL_ACCOUNT_ID."]),
  ];

  res.json({
    success: true,
    data: {
      modes: ["DRAFT_ONLY", "AUTO_SEND"],
      aiProvider: env.AI_PROVIDER,
      aiConfigured,
      googleConfigured,
      hunterConfigured,
      hunterMailboxConfigured,
      outboundEnabled: env.OUTREACH_ENABLED,
      outboundConfigured,
      outboundBlockers,
    },
  });
});
router.get("/campaigns", asyncHandler(async (req, res) => { const { page, limit } = pageSchema.parse(req.query); res.json({ success: true, data: await campaignRepository.list(page, limit) }); }));
router.post("/campaigns", asyncHandler(async (req, res) => { const input = createCampaignSchema.parse(req.body); res.status(201).json({ success: true, data: await campaignRepository.create(input.name, input.config) }); }));
router.get("/campaigns/:id", asyncHandler(async (req, res) => res.json({ success: true, data: await campaignRepository.get(req.params.id) })));
router.patch("/campaigns/:id", asyncHandler(async (req, res) => { const input = updateCampaignSchema.parse(req.body); res.json({ success: true, data: await campaignRepository.update(req.params.id, input.version, input.name, input.config) }); }));
router.post("/campaigns/:id/activate", asyncHandler(async (req, res) => {
  const campaign = await campaignRepository.get(req.params.id);
  const config = campaignConfigSchema.parse(campaign.config);
  if (config.mode === "AUTO_SEND") {
    if (env.AI_PROVIDER !== "nvidia" || !env.NVIDIA_API_KEY) {
      throw new ApiError(503, "Auto-send requires model-backed AI. Configure AI_PROVIDER=nvidia and NVIDIA_API_KEY first.");
    }
    if (!env.OUTREACH_ENABLED || !env.HUNTER_API_KEY || !env.HUNTER_EMAIL_ACCOUNT_ID) {
      throw new ApiError(503, "Auto-send requires OUTREACH_ENABLED=true, HUNTER_API_KEY, and HUNTER_EMAIL_ACCOUNT_ID.");
    }
  }
  res.json({ success: true, data: await campaignRepository.activate(campaign.id, config) });
}));
router.post("/campaigns/:id/pause", asyncHandler(async (req, res) => res.json({ success: true, data: await campaignRepository.pause(req.params.id) })));
router.post("/campaigns/:id/runs", asyncHandler(async (req, res) => { const key = z.string().min(8).max(100).regex(/^[a-zA-Z0-9:_-]+$/).parse(req.headers["idempotency-key"]); const run = await campaignRepository.enqueue(req.params.id, key); res.status(202).json({ success: true, data: { id: run.id, status: run.status } }); }));
router.get("/automation/runs", asyncHandler(async (req, res) => { const { page, limit } = pageSchema.parse(req.query); const campaignId = z.string().max(191).optional().parse(req.query.campaignId); res.json({ success: true, data: await runRepository.list(campaignId, page, limit) }); }));
router.get("/automation/runs/:id", asyncHandler(async (req, res) => res.json({ success: true, data: await runRepository.get(req.params.id) })));
router.post("/automation/runs/:id/cancel", asyncHandler(async (req, res) => { await runRepository.cancel(req.params.id); res.json({ success: true }); }));
router.post("/automation/runs/:id/retry", asyncHandler(async (req, res) => { await runRepository.retry(req.params.id); res.status(202).json({ success: true }); }));
router.post("/drafts/:id/review", asyncHandler(async (req, res) => { const input = draftReviewSchema.parse(req.body); const job = await approveLead({ assessmentId: req.params.id, version: input.version, decision: input.action === "APPROVE" ? "APPROVED" : "REJECTED" }); res.status(job ? 202 : 200).json({ success: true, data: job ? { id: job.id, status: job.status } : null }); }));
router.patch("/drafts/:id", asyncHandler(async (_req, _res) => { throw new ApiError(410, "Legacy assessment editing is retired. Edit the generated agent draft instead."); }));
export default router;
