import { Router } from "express";
import { z } from "zod";
import { providerKeyService } from "../services/provider-key.service";
import { asyncHandler } from "../utils/async-handler";
import { ApiError } from "../utils/api-error";
import { env } from "../config/env";

const router = Router();
const keySchema = z.object({ apiKey: z.string().min(20).max(500) }).strict();

function requireLocalOrigin(origin: string | undefined) {
  const allowed = [env.FRONTEND_URL, "http://localhost:3000", "http://localhost:3001"];
  if (!origin || !allowed.includes(origin)) throw new ApiError(403, "Request origin is not allowed.");
}

router.get("/ai-provider", (_req, res) => {
  if (!providerKeyService.status().localSetupAvailable) throw new ApiError(404, "Local provider setup is unavailable in this environment.");
  const { localSetupAvailable: _localSetupAvailable, ...status } = providerKeyService.status();
  res.json({ success: true, data: status });
});

router.put("/ai-provider/nvidia", asyncHandler(async (req, res) => {
  requireLocalOrigin(req.get("origin"));
  const input = keySchema.parse(req.body);
  res.json({ success: true, data: await providerKeyService.saveNvidiaKey(input.apiKey) });
}));

export default router;
