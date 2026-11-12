import { CallEligibilityStatus, CallOutcome } from "@prisma/client";
import prisma from "../config/database";
import { currentOrganization, requestContext } from "../context/request-context";
import { ApiError } from "../utils/api-error";

const outcomesThatStopCalls = new Set<CallOutcome>(["NOT_INTERESTED", "WRONG_NUMBER", "DO_NOT_CALL"]);

function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

export const callService = {
  async getProfile(leadId: string) {
    const organizationId = currentOrganization();
    const lead = await prisma.lead.findFirst({ where: { id: leadId, organizationId }, include: { callProfile: true, callActivities: { where: { organizationId }, orderBy: { createdAt: "desc" }, take: 20 } } });
    if (!lead) throw ApiError.notFound("Lead not found.");
    const eligible = lead.callProfile?.status === "ELIGIBLE" && lead.callProfile.interestConfirmed && Boolean(lead.callProfile.doNotCallCheckedAt) && Boolean(lead.phone || lead.internationalPhone);
    return { profile: lead.callProfile, activities: lead.callActivities, phoneNumber: lead.internationalPhone || lead.phone, canCall: eligible, blockers: [
      ...(!lead.phone && !lead.internationalPhone ? ["No phone number is available."] : []),
      ...(lead.callProfile?.status === "DO_NOT_CALL" ? ["This lead is marked do not call."] : []),
      ...(lead.callProfile?.status !== "ELIGIBLE" ? ["Mark the lead eligible after checking the applicable calling rules."] : []),
      ...(!lead.callProfile?.interestConfirmed ? ["Record that the contact has requested or agreed to a call."] : []),
      ...(!lead.callProfile?.doNotCallCheckedAt ? ["Record a completed do-not-call registry check."] : []),
    ] };
  },

  async updateProfile(leadId: string, input: { eligible: boolean; interestConfirmed: boolean; interestEvidence?: string; doNotCallChecked: boolean; timeZone?: string }) {
    const organizationId = currentOrganization();
    const lead = await prisma.lead.findFirst({ where: { id: leadId, organizationId }, select: { id: true, phone: true, internationalPhone: true, businessStatus: true, callProfile: { select: { status: true } } } });
    if (!lead) throw ApiError.notFound("Lead not found.");
    if (lead.callProfile?.status === "DO_NOT_CALL") throw new ApiError(403, "This number is suppressed. An operator cannot re-enable it.");
    if (input.eligible && !lead.phone && !lead.internationalPhone) throw new ApiError(422, "A phone number is required before a lead can be marked eligible.");
    if (input.eligible && (!input.interestConfirmed || !input.interestEvidence?.trim() || !input.doNotCallChecked)) throw new ApiError(422, "Eligibility requires recorded interest, evidence, and a completed do-not-call check.");
    const userId = requestContext.getStore()?.userId ?? "anonymous";
    return prisma.leadCallProfile.upsert({
      where: { leadId },
      update: { status: input.eligible ? CallEligibilityStatus.ELIGIBLE : CallEligibilityStatus.REVIEW_REQUIRED, interestConfirmed: input.interestConfirmed, interestEvidence: input.interestEvidence?.trim() || null, doNotCallCheckedAt: input.doNotCallChecked ? new Date() : null, timeZone: input.timeZone || null, checkedBy: userId },
      create: { organizationId, leadId, status: input.eligible ? CallEligibilityStatus.ELIGIBLE : CallEligibilityStatus.REVIEW_REQUIRED, interestConfirmed: input.interestConfirmed, interestEvidence: input.interestEvidence?.trim() || null, doNotCallCheckedAt: input.doNotCallChecked ? new Date() : null, timeZone: input.timeZone || null, checkedBy: userId },
    });
  },

  async logActivity(leadId: string, input: { outcome: CallOutcome; notes?: string; followUpAt?: string }) {
    const organizationId = currentOrganization();
    const lead = await prisma.lead.findFirst({ where: { id: leadId, organizationId }, select: { id: true, phone: true, internationalPhone: true, callProfile: true } });
    if (!lead) throw ApiError.notFound("Lead not found.");
    if (!lead.phone && !lead.internationalPhone) throw new ApiError(422, "A phone number is required to log a call.");
    if (lead.callProfile?.status !== "ELIGIBLE" || !lead.callProfile.interestConfirmed || !lead.callProfile.doNotCallCheckedAt) throw new ApiError(403, "Call eligibility checks are incomplete.");
    const result = await prisma.$transaction(async tx => {
      const activity = await tx.callActivity.create({ data: { organizationId, leadId, phoneNumber: normalizePhone(lead.internationalPhone || lead.phone!), outcome: input.outcome, notes: input.notes?.trim() || null, followUpAt: input.followUpAt ? new Date(input.followUpAt) : null, userId: requestContext.getStore()?.userId ?? "anonymous" } });
      if (outcomesThatStopCalls.has(input.outcome)) {
        await tx.leadCallProfile.update({ where: { leadId }, data: { status: CallEligibilityStatus.DO_NOT_CALL, interestConfirmed: false } });
      }
      return activity;
    });
    return result;
  },
};
