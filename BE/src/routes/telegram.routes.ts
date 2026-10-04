import { Router } from "express";
import { asyncHandler } from "../utils/async-handler";
import { ApiError } from "../utils/api-error";
import { env } from "../config/env";
import { createTelegramLink, disconnectTelegram, getTelegramStatus } from "../services/telegram.service";

const router = Router();

router.get("/status", asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await getTelegramStatus() });
}));

router.post("/link-code", asyncHandler(async (_req, res) => {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_BOT_USERNAME) throw new ApiError(503, "Telegram bot is not configured on the server.");
  res.status(201).json({ success: true, data: await createTelegramLink() });
}));

router.delete("/connection", asyncHandler(async (_req, res) => {
  await disconnectTelegram();
  res.json({ success: true });
}));

export default router;
