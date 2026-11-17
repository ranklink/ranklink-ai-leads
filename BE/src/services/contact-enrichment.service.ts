import prisma from "../config/database";
import { currentOrganization } from "../context/request-context";
import { findContacts } from "./hunter.service";
import { ApiError } from "../utils/api-error";

export async function enrichLeadContacts(leadId: string) {
  const organizationId = currentOrganization();
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId },
    select: { id: true, name: true, website: true },
  });

  if (!lead) throw ApiError.notFound("Lead not found");
  if (!lead.website) throw ApiError.badRequest("Add a company website before searching for contacts.");

  let domain: string;
  try {
    const website = new URL(lead.website);
    if (!["http:", "https:"].includes(website.protocol)) throw new Error("Unsupported website protocol");
    domain = website.hostname.replace(/^www\./i, "");
  } catch {
    throw ApiError.badRequest("This lead does not have a valid company website.");
  }

  const candidates = await findContacts(domain, 10);
  const contacts = await prisma.$transaction(async (tx) => {
    for (const candidate of candidates) {
      await tx.leadContact.upsert({
        where: { organizationId_leadId_email: { organizationId, leadId, email: candidate.email } },
        update: {
          name: candidate.name,
          role: candidate.role,
          source: "HUNTER",
          confidence: candidate.confidence,
          verificationStatus: candidate.verificationStatus,
        },
        create: {
          organizationId,
          leadId,
          name: candidate.name,
          email: candidate.email,
          role: candidate.role,
          source: "HUNTER",
          confidence: candidate.confidence,
          verificationStatus: candidate.verificationStatus,
        },
      });
    }
    return tx.leadContact.findMany({
      where: { organizationId, leadId },
      orderBy: [{ confidence: "desc" }, { updatedAt: "desc" }],
      take: 50,
      select: { id: true, name: true, email: true, role: true, source: true, confidence: true, verificationStatus: true, updatedAt: true },
    });
  });

  return { domain, found: candidates.length, contacts };
}
