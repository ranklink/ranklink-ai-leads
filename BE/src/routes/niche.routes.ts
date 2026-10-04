import { Router } from "express";
import { asyncHandler } from "../utils/async-handler";
import * as nicheController from "../controllers/niche.controller";

const router = Router();

router.get("/suggest", asyncHandler(nicheController.suggestNiches));

export default router;
