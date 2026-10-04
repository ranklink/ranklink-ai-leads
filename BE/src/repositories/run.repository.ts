import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import prisma from "../config/database";
import { currentOrganization, authContext } from "../auth/context";
import { ApiError } from "../utils/api-error";
import { LEASE_MS, MAX_RUN_ATTEMPTS, RunStopped, BudgetExceeded } from "../services/automation/policy";

export const runRepository = {
  async list(campaignId: string | undefined, page: number, limit: number) {
    const where = { campaignId, campaign: { organizationId: currentOrganization() } };
    const [items, total] = await prisma.$transaction([
      prisma.automationRun.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit, select: { id: true, campaignId: true, status: true, stage: true, attempts: true, aiCalls: true, googleCalls: true, createdAt: true, finishedAt: true, errorMessage: true, campaign: { select: { name: true } }, _count: { select: { assessments: true } } } }),
      prisma.automationRun.count({ where }),
    ]);
    return { items, total, page, limit };
  },
  async get(id: string) {
    const run = await prisma.automationRun.findFirst({ where: { id, campaign: { organizationId: currentOrganization() } }, include: { campaign: { select: { name: true } }, assessments: { orderBy: { createdAt: "asc" }, take: 20, include: { lead: { select: { id: true, name: true, leadScore: true, googleMapsUrl: true } } } }, events: { orderBy: { createdAt: "desc" }, take: 100 } } });
    if (!run) throw ApiError.notFound("Run not found");
    const { leaseToken: _token, discoveryData: _discovery, ...publicRun } = run;
    return publicRun;
  },
  async cancel(id: string) {
    const changed = await prisma.automationRun.updateMany({ where: { id, campaign: { organizationId: currentOrganization() }, status: { in: ["QUEUED", "RUNNING"] } }, data: { status: "CANCELLED", leaseToken: null, leaseUntil: null, finishedAt: new Date() } });
    if (!changed.count) throw new ApiError(409, "Run is missing or already finished");
    await prisma.runEvent.create({ data: { runId: id, type: "CANCELLED", message: "Run cancelled by operator" } });
  },
  async retry(id: string) {
    const changed = await prisma.automationRun.updateMany({ where: { id, campaign: { organizationId: currentOrganization(), status: "ACTIVE" }, status: "FAILED", attempts: { lt: MAX_RUN_ATTEMPTS } }, data: { status: "QUEUED", leaseToken: null, leaseUntil: null, availableAt: new Date(), finishedAt: null, errorCode: null, errorMessage: null } });
    if (!changed.count) throw new ApiError(409, "Retry requires a failed run, active campaign, and remaining attempts");
  },
  async claim() {
    const now = new Date();
    await prisma.automationRun.updateMany({ where: { status: "RUNNING", leaseUntil: { lt: now }, attempts: { gte: MAX_RUN_ATTEMPTS } }, data: { status: "FAILED", errorCode: "ATTEMPTS_EXHAUSTED", errorMessage: "Worker recovery attempts exhausted", finishedAt: now, leaseToken: null, leaseUntil: null } });
    const eligible = { campaign: { status: "ACTIVE" as const }, attempts: { lt: MAX_RUN_ATTEMPTS }, OR: [{ status: "QUEUED" as const, availableAt: { lte: now } }, { status: "RUNNING" as const, leaseUntil: { lt: now } }] };
    const candidate = await prisma.automationRun.findFirst({ where: eligible, orderBy: { availableAt: "asc" }, select: { id: true } });
    if (!candidate) return null;
    const leaseToken = randomUUID();
    const claimed = await prisma.automationRun.updateMany({ where: { id: candidate.id, ...eligible }, data: { status: "RUNNING", leaseToken, leaseUntil: new Date(Date.now() + LEASE_MS), attempts: { increment: 1 } } });
    if (!claimed.count) return null;
    return prisma.automationRun.findUniqueOrThrow({ where: { id: candidate.id }, include: { campaign: true } });
  },
  async fenced<T>(id: string, leaseToken: string, operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(async tx => {
      const updated = await tx.automationRun.updateMany({ where: { id, leaseToken, status: "RUNNING", leaseUntil: { gt: new Date() }, campaign: { status: "ACTIVE" } }, data: { leaseUntil: new Date(Date.now() + LEASE_MS) } });
      if (!updated.count) throw new RunStopped("Run was stopped or its lease expired");
      return operation(tx);
    });
  },
  async reserveCall(id: string, leaseToken: string, kind: "aiCalls" | "googleCalls", limit: number) {
    await this.fenced(id, leaseToken, async tx => {
      const changed = await tx.automationRun.updateMany({ where: { id, [kind]: { lt: limit } }, data: { [kind]: { increment: 1 } } });
      if (!changed.count) throw new BudgetExceeded(`${kind} budget exhausted`);
    });
  },
  async review(id: string, version: number, action: "APPROVE" | "REJECT") {
    const changed = await prisma.leadAssessment.updateMany({ where: { id, version, status: "REVIEW", run: { campaign: { organizationId: currentOrganization() } } }, data: { status: action === "APPROVE" ? "APPROVED" : "REJECTED", approvedBy: action === "APPROVE" ? authContext.getStore()!.userId : null, approvedAt: action === "APPROVE" ? new Date() : null } });
    if (!changed.count) throw new ApiError(409, "Draft changed or is no longer awaiting review. Reload before reviewing.");
  },
  async edit(id: string, version: number, subject: string, body: string) {
    const changed = await prisma.leadAssessment.updateMany({ where: { id, version, status: { in: ["REVIEW", "APPROVED", "REJECTED"] }, run: { campaign: { organizationId: currentOrganization() } } }, data: { subject, body, version: { increment: 1 }, status: "REVIEW", approvedAt: null, approvedBy: null } });
    if (!changed.count) throw new ApiError(409, "Draft changed or cannot be edited. Reload and try again.");
  },
};
