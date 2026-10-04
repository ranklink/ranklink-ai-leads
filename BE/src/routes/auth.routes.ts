import { Router } from "express";
import { randomBytes } from "node:crypto";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import prisma from "../config/database";
import { hashPassword, hashToken, verifyPassword } from "../auth/password";
import { authContext } from "../auth/context";
import { requireAuth, sessionToken } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import { ApiError } from "../utils/api-error";
import { env } from "../config/env";

const router = Router();
const credentials = z.object({ email: z.string().trim().email().max(254).transform(value => value.toLowerCase()), password: z.string().min(1).max(256) }).strict();
const cookieOptions = { httpOnly: true, secure: env.isProduction, sameSite: env.isProduction ? "none" as const : "lax" as const, path: "/api/v1" };
const dummyHash = hashPassword(randomBytes(32).toString("hex"));

router.post("/login", rateLimit({ windowMs: 15 * 60_000, max: 10, standardHeaders: true, legacyHeaders: false, message: { success: false, message: "Too many sign-in attempts. Try again later." } }), asyncHandler(async (req, res) => {
  const input = credentials.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const valid = await verifyPassword(input.password, user?.passwordHash ?? await dummyHash);
  if (!user || !valid || user.disabled) throw new ApiError(401, "Email or password is incorrect");
  const token = randomBytes(32).toString("hex");
  const oldToken = sessionToken(req);
  if (oldToken) await prisma.session.deleteMany({ where: { tokenHash: hashToken(oldToken) } });
  await prisma.session.create({ data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 8 * 60 * 60_000) } });
  res.cookie("leads_session", token, { ...cookieOptions, maxAge: 8 * 60 * 60_000 }).json({ success: true, data: { email: user.email } });
}));

router.get("/me", requireAuth, asyncHandler(async (_req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: authContext.getStore()!.userId }, select: { email: true, role: true, organization: { select: { name: true } } } });
  res.json({ success: true, data: user });
}));
router.post("/logout", asyncHandler(async (req, res) => {
  const token = sessionToken(req);
  if (token) await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  res.clearCookie("leads_session", cookieOptions).json({ success: true });
}));
export default router;
