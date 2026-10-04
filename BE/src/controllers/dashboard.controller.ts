import { Request, Response } from "express";
import prisma from "../config/database";
import { searchRepository } from "../repositories/search.repository";
import { currentOrganization } from "../auth/context";

export async function getDashboardStats(_req: Request, res: Response) {
  const [totalLeads, hotLeads, withoutWebsite, searchesThisMonth] = await Promise.all([
    prisma.lead.count({ where: { organizationId: currentOrganization() } }),
    prisma.lead.count({ where: { organizationId: currentOrganization(), leadScore: { gte: 80 } } }),
    prisma.lead.count({ where: { organizationId: currentOrganization(), websiteExists: false } }),
    searchRepository.countThisMonth(),
  ]);

  res.json({
    success: true,
    data: {
      totalLeads,
      hotLeads,
      withoutWebsite,
      searchesThisMonth,
    },
  });
}
