import type { Request, Response, NextFunction } from "express";
import prisma from "../config/database";
import { authContext } from "../auth/context";
import { hashToken } from "../auth/password";
import { ApiError } from "../utils/api-error";
import { env } from "../config/env";

export function sessionToken(req: Request): string | undefined {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;

  for (const cookie of cookieHeader.split(";")) {
    const separator = cookie.indexOf("=");
    if (separator < 0 || cookie.slice(0, separator).trim() !== "leads_session") continue;
    return decodeURIComponent(cookie.slice(separator + 1).trim());
  }
  return undefined;
}

export function sameOrigin(req: Request, _res: Response, next: NextFunction) {
  if (env.isProduction && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.get("origin");
    if (!origin || origin !== env.FRONTEND_URL) return next(new ApiError(403, "Request origin is not allowed."));
  }
  return next();
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = sessionToken(req);
    if (token) {
      const session = await prisma.session.findUnique({
        where: { tokenHash: hashToken(token) },
        include: { user: true },
      });
      if (session && session.expiresAt > new Date() && !session.user.disabled) {
        authContext.run({ organizationId: session.user.organizationId, userId: session.user.id, role: session.user.role }, next);
        return;
      }
    }

    if (env.isProduction) return next(new ApiError(401, "Please sign in to continue."));

    // Local development convenience. Production always requires a real session.
    const existingOrg = await prisma.organization.findFirst({ select: { id: true } });
    const organization = existingOrg ?? await prisma.organization.create({ data: { name: "Local Dev" } });
    let user = await prisma.user.findFirst({ where: { organizationId: organization.id } });
    if (!user) user = await prisma.user.create({ data: { organizationId: organization.id, email: "dev@local.dev", passwordHash: "dev", role: "ADMIN" } });
    authContext.run({ organizationId: organization.id, userId: user.id, role: user.role }, next);
  } catch (error) { next(error); }
}
