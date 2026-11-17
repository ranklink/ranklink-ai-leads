import { Router } from "express";
import { asyncHandler } from "../utils/async-handler";
import { contactEnrichmentRateLimiter, searchRateLimiter } from "../middleware/rate-limit.middleware";
import * as leadController from "../controllers/lead.controller";
import { enrichLeadContacts } from "../services/contact-enrichment.service";
import { ApiError } from "../utils/api-error";
import { z } from "zod";

const router = Router();

router.post("/search", searchRateLimiter, asyncHandler(leadController.searchLeads));
router.get("/export", asyncHandler(leadController.exportLeads));
router.get("/", asyncHandler(leadController.getLeads));
router.post("/:id/contacts/enrich", contactEnrichmentRateLimiter, asyncHandler(async (req, res) => {
  const id = z.string().min(1).max(191).parse(req.params.id);
  const result = await enrichLeadContacts(id);
  res.json({ success: true, data: result });
}));
router.get("/:id", asyncHandler(leadController.getLeadById));

export default router;
