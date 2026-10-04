import { Router } from "express";
import leadRoutes from "./lead.routes";
import searchRoutes from "./search.routes";
import dashboardRoutes from "./dashboard.routes";
import nicheRoutes from "./niche.routes";
import outreachRoutes from "./outreach.routes";
import campaignRoutes from "./campaign.routes";
import agentRoutes from "./agent.routes";
import telegramRoutes from "./telegram.routes";

const router = Router();
router.use(campaignRoutes);
router.use(agentRoutes);
router.use("/telegram", telegramRoutes);

router.get("/health", (_req, res) => {
  res.json({ success: true, message: "API is running", timestamp: new Date().toISOString() });
});

router.use("/leads", leadRoutes);
router.use("/searches", searchRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/niches", nicheRoutes);
router.use("/outreach", outreachRoutes);

export default router;
