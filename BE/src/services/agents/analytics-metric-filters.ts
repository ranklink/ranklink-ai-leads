import { Prisma } from "@prisma/client";

interface AnalyticsMetricFilterInput {
  organizationId: string;
  periodStart: Date;
  periodEnd: Date;
  campaignId: string | null;
  campaignRunIds: string[] | null;
}

export function buildAnalyticsMetricFilters({ organizationId, periodStart, periodEnd, campaignId, campaignRunIds }: AnalyticsMetricFilterInput) {
  const createdAt = { gte: periodStart, lte: periodEnd };
  const scopedRunIds = campaignRunIds;
  const campaignAgentJob: Prisma.AgentJobWhereInput | undefined = campaignId === null ? undefined : {
    OR: [
      { automationRunId: { in: scopedRunIds ?? [] } },
      { assessment: { is: { runId: { in: scopedRunIds ?? [] } } } },
      { inputJson: { path: "campaignId", equals: campaignId } },
    ],
  };

  return {
    leads: {
      organizationId,
      createdAt,
      ...(campaignId === null ? {} : {
        OR: [
          { assessments: { some: { runId: { in: scopedRunIds ?? [] } } } },
          { agentJobs: { some: { inputJson: { path: "campaignId", equals: campaignId } } } },
        ],
      }),
    } satisfies Prisma.LeadWhereInput,
    qualifications: {
      organizationId,
      createdAt,
      ...(campaignAgentJob ? { job: { is: campaignAgentJob } } : {}),
    } satisfies Prisma.LeadQualificationWhereInput,
    drafts: {
      organizationId,
      createdAt,
      ...(campaignAgentJob ? { job: { is: campaignAgentJob } } : {}),
    } satisfies Prisma.OutreachDraftWhereInput,
    sent: {
      organizationId,
      occurredAt: createdAt,
      eventType: "SENT",
      ...(campaignAgentJob ? { draft: { is: { job: { is: campaignAgentJob } } } } : {}),
    } satisfies Prisma.OutreachEventWhereInput,
    failedJobs: {
      organizationId,
      createdAt,
      status: "FAILED",
      ...(campaignAgentJob ? campaignAgentJob : {}),
    } satisfies Prisma.AgentJobWhereInput,
  };
}
