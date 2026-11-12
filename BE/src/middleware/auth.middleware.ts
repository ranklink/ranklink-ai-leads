import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/api-error";
import { env } from "../config/env";
import { resolveSession } from "../services/auth.service";

export const SESSION_COOKIE_NAME = "leado_session";

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  const item = header.split(";").map(part => part.trim()).find(part => part.startsWith(`${name}=`));
  return item ? item.slice(name.length + 1) : null;
}

export async function authenticateRequest(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = readCookie(req, SESSION_COOKIE_NAME);
    if (token) {
      const session = await resolveSession(token);
      if (session) {
        req.sessionToken = token;
        req.authenticatedUser = {
          id: session.user.id,
          organizationId: session.user.organizationId,
          email: session.user.email,
          role: session.user.role,
        };
      }
    }
    if (env.AUTH_REQUIRED && !req.authenticatedUser) return next(new ApiError(401, "Sign in to continue."));
    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireAuthenticatedUser(req: Request): NonNullable<Request["authenticatedUser"]> {
  if (!req.authenticatedUser) throw new ApiError(401, "Sign in to continue.");
  return req.authenticatedUser;
}

export function authorizeWorkspaceWrites(req: Request, _res: Response, next: NextFunction) {
  if (env.AUTH_REQUIRED && !["GET", "HEAD", "OPTIONS"].includes(req.method) && req.authenticatedUser?.role === "VIEWER") {
    return next(new ApiError(403, "This account has read-only access."));
  }
  return next();
}

export function sessionCookieOptions() {
  return { httpOnly: true as const, secure: env.isProduction, sameSite: "lax" as const, path: "/api/v1", maxAge: 7 * 24 * 60 * 60 * 1000 };
}

export function sessionTokenFromRequest(req: Request) {
  return readCookie(req, SESSION_COOKIE_NAME);
}
