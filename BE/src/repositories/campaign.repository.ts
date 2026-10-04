import { Prisma } from "@prisma/client";
import prisma from "../config/database";
import { currentOrganization } from "../auth/context";
import { ApiError } from "../utils/api-error";
import type { CampaignConfig } from "../validators/campaign.validator";
import { nextSchedule } from "../services/automation/policy";

export const campaignRepository = {
  async list(page: number, limit: number) {
    const where = { organizationId: currentOrganization() };
    const [items, total] = await prisma.$transaction([
      prisma.campaign.findMany({ where, take: limit, skip: (page - 1) * limit, orderBy: { createdAt: "desc" }, include: { _count: { select: { runs: true } } } }),
      prisma.campaign.count({ where }),
    ]);
    return { items, total, page, limit };
  },
  async get(id: string) {
    const campaign = await prisma.campaign.findUnique({ where: { id, organizationId: currentOrganization() } });
    if (!campaign) throw ApiError.notFound("Campaign not found");
    return campaign;
  },
  create(name: string, config: CampaignConfig) {
    return prisma.campaign.create({ data: { organizationId: currentOrganization(), name, config } });
  },
  async update(id: string, version: number, name: string, config: CampaignConfig) {
    const changed = await prisma.campaign.updateMany({ where: { id, organizationId: currentOrganization(), version, status: { not: "ACTIVE" } }, data: { name, config, version: { increment: 1 } } });
    if (!changed.count) throw new ApiError(409, "Pause the campaign and reload its latest version before editing");
    return this.get(id);
  },
  async activate(id: string, config: CampaignConfig) {
    return prisma.campaign.update({ where: { id, organizationId: currentOrganization() }, data: { status: "ACTIVE", nextRunAt: nextSchedule(config.intervalHours) } });
  },
  async pause(id: string) {
    await this.get(id);
    await prisma.$transaction(async tx => {
      await tx.campaign.update({ where: { id, organizationId: currentOrganization() }, data: { status: "PAUSED", nextRunAt: null } });
      await tx.automationRun.updateMany({ where: { campaignId: id, status: { in: ["QUEUED", "RUNNING"] } }, data: { status: "CANCELLED", leaseToken: null, leaseUntil: null, finishedAt: new Date() } });
    });
    return this.get(id);
  },
  async enqueue(id: string, requestKey: string) {
    return prisma.$transaction(async tx => {
      const campaign = await tx.campaign.findUnique({ where: { id, organizationId: currentOrganization() } });
      if (!campaign) throw ApiError.notFound("Campaign not found");
      if (campaign.status !== "ACTIVE") throw new ApiError(409, "Activate the campaign before starting a run");
      // Lock the campaign row to serialize enqueue and pause, and prevent overlapping runs.
      await tx.campaign.update({ where: { id, version: campaign.version }, data: { updatedAt: new Date() } });
      const existing = await tx.automationRun.findUnique({ where: { campaignId_requestKey: { campaignId: id, requestKey } } });
      if (existing) return existing;
      if (await tx.automationRun.count({ where: { campaignId: id, status: { in: ["QUEUED", "RUNNING"] } } })) throw new ApiError(409, "This campaign already has an active run");
      return tx.automationRun.create({ data: { campaignId: id, requestKey, config: campaign.config as Prisma.InputJsonValue, campaignVersion: campaign.version, events: { create: { type: "QUEUED", message: "Draft-only workflow queued" } } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  },
};
