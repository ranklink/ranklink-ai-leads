import { Router } from "express";
import { timingSafeEqual } from "node:crypto";
import { asyncHandler } from "../utils/async-handler";
import { ApiError } from "../utils/api-error";
import { env } from "../config/env";
import { enqueueTelegramUpdate } from "../services/telegram.service";

const router = Router();
router.post("/", asyncHandler(async (req, res) => {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_WEBHOOK_SECRET) throw ApiError.notFound("Telegram webhook is not configured.");
  const received = req.get("x-telegram-bot-api-secret-token") ?? "";
  const expected = env.TELEGRAM_WEBHOOK_SECRET;
  const valid = received.length === expected.length && timingSafeEqual(Buffer.from(received), Buffer.from(expected));
  if (!valid) throw new ApiError(401, "Invalid webhook signature.");
  await enqueueTelegramUpdate(req.body);
  res.status(200).json({ success: true });
}));
export default router;
