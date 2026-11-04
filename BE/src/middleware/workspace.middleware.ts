import type { Request, Response, NextFunction } from "express";
import prisma from "../config/database";
import { requestContext } from "../context/request-context";
import { ApiError } from "../utils/api-error";
import { env } from "../config/env";

let defaultOrganizationPromise: Promise<string> | undefined;

async function defaultOrganizationId(): Promise<string> {
  if (!defaultOrganizationPromise) {
    defaultOrganizationPromise = (async () => {
      const existing = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
      const organization = existing ?? await prisma.organization.create({ data: { name: "Default Workspace" }, select: { id: true } });
      return organization.id;
    })().catch(error => {
      defaultOrganizationPromise = undefined;
      throw error;
    });
  }
  return defaultOrganizationPromise;
}

export function sameOrigin(req: Request, _res: Response, next: NextFunction) {
  if (env.isProduction && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.get("origin");
    if (!origin || origin !== env.FRONTEND_URL) return next(new ApiError(403, "Request origin is not allowed."));
  }
  return next();
}

export async function establishWorkspaceContext(_req: Request, _res: Response, next: NextFunction) {
  try {
    const organizationId = await defaultOrganizationId();
    requestContext.run({ organizationId, userId: "anonymous", role: "OPERATOR" }, next);
  } catch (error) {
    next(error);
  }
}
