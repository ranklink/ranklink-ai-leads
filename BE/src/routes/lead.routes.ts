import { Router } from "express";
import { asyncHandler } from "../utils/async-handler";
import { searchRateLimiter } from "../middleware/rate-limit.middleware";
import * as leadController from "../controllers/lead.controller";

const router = Router();

router.post("/search", searchRateLimiter, asyncHandler(leadController.searchLeads));
router.get("/export", asyncHandler(leadController.exportLeads));
router.get("/", asyncHandler(leadController.getLeads));
router.get("/:id", asyncHandler(leadController.getLeadById));

export default router;
