import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env";
import { asyncHandler } from "../utils/async-handler";
import { ApiError } from "../utils/api-error";
import { authenticateUser, createSession, publicUser, revokeSession } from "../services/auth.service";
import { authenticateRequest, requireAuthenticatedUser, SESSION_COOKIE_NAME, sessionCookieOptions, sessionTokenFromRequest } from "../middleware/auth.middleware";

const router = Router();
const loginSchema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(200) });

router.get("/status", (_req, res) => res.json({ success: true, data: { required: env.AUTH_REQUIRED } }));

router.post("/login", asyncHandler(async (req, res) => {
  if (!env.AUTH_REQUIRED) return res.json({ success: true, data: { required: false, user: null } });
  const input = loginSchema.parse(req.body);
  const user = await authenticateUser(input.email, input.password);
  if (!user) throw new ApiError(401, "Invalid email or password.");
  const session = await createSession(user.id);
  res.cookie(SESSION_COOKIE_NAME, session.token, sessionCookieOptions());
  res.json({ success: true, data: { required: true, user: publicUser(user), expiresAt: session.expiresAt.toISOString() } });
}));

router.post("/logout", asyncHandler(async (req, res) => {
  const token = sessionTokenFromRequest(req);
  if (token) await revokeSession(token);
  res.clearCookie(SESSION_COOKIE_NAME, { path: "/api/v1", httpOnly: true, secure: env.isProduction, sameSite: "lax" });
  res.json({ success: true });
}));

router.get("/me", authenticateRequest, (req, res) => {
  const user = req.authenticatedUser;
  res.json({ success: true, data: { required: env.AUTH_REQUIRED, user: user ? publicUser(user) : null } });
});

router.get("/session", authenticateRequest, (req, res) => {
  const user = requireAuthenticatedUser(req);
  res.json({ success: true, data: publicUser(user) });
});

export default router;
