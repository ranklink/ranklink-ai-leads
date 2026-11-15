import type { AgentJob, AgentType } from "@prisma/client";

export const AGENT_JOB_TYPES = [
  "RESEARCH",
  "QUALIFICATION",
  "CONTACT_ENRICHMENT",
  "OUTREACH",
  "FOLLOW_UP",
  "ANALYTICS",
] as const satisfies readonly AgentType[];

export type AgentJobExecutors = Record<AgentType, (job: AgentJob) => Promise<unknown>>;

export function dispatchAgentJob(job: AgentJob, executors: AgentJobExecutors): Promise<unknown> {
  return executors[job.type](job);
}
