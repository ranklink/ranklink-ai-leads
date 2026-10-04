import { Router } from "express";
import { asyncHandler } from "../utils/async-handler";
import * as dashboardController from "../controllers/dashboard.controller";

const router = Router();

router.get("/stats", asyncHandler(dashboardController.getDashboardStats));

export default router;
