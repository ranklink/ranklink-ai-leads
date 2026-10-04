import { randomUUID } from "node:crypto";
import { Prisma, type AgentJob, type AgentType } from "@prisma/client";
import prisma from "../config/database";
import { currentOrganization } from "../auth/context";

const AGENT_LEASE_MS = 90_000;

export interface EnqueueAgentJobInput {
  organizationId?: string;
  leadId?: string;
  automationRunId?: string;
  assessmentId?: string;
  type: AgentType;
  idempotencyKey: string;
  input: Prisma.InputJsonValue;
  runAfter?: Date;
}

export const agentJobRepository = {
  async enqueue(input: EnqueueAgentJobInput): Promise<AgentJob> {
    const organizationId = input.organizationId ?? currentOrganization();
    return prisma.agentJob.upsert({
      where: { organizationId_idempotencyKey: { organizationId, idempotencyKey: input.idempotencyKey } },
      update: {},
      create: {
        organizationId,
        leadId: input.leadId,
        automationRunId: input.automationRunId,
        assessmentId: input.assessmentId,
        type: input.type,
        idempotencyKey: input.idempotencyKey,
        inputJson: input.input,
        runAfter: input.runAfter,
      },
    });
  },

  async claim(): Promise<AgentJob | null> {
    const now = new Date();
    await prisma.agentJob.updateMany({
      where: { status: "RUNNING", leaseUntil: { lt: now }, attempts: { gte: 3 } },
      data: { status: "FAILED", leaseToken: null, leaseUntil: null, finishedAt: now, errorCode: "ATTEMPTS_EXHAUSTED", errorMessage: "Agent retry limit reached." },
    });
    const eligible = {
      attempts: { lt: 3 },
      OR: [
        { status: "QUEUED" as const, runAfter: { lte: now } },
        { status: "RUNNING" as const, leaseUntil: { lt: now } },
      ],
    };
    const candidate = await prisma.agentJob.findFirst({ where: eligible, orderBy: { runAfter: "asc" }, select: { id: true } });
    if (!candidate) return null;
    const leaseToken = randomUUID();
    const claimed = await prisma.agentJob.updateMany({
      where: { id: candidate.id, ...eligible },
      data: { status: "RUNNING", leaseToken, leaseUntil: new Date(Date.now() + AGENT_LEASE_MS), attempts: { increment: 1 }, errorCode: null, errorMessage: null },
    });
    return claimed.count ? prisma.agentJob.findUnique({ where: { id: candidate.id } }) : null;
  },

  async complete(job: AgentJob) {
    const changed = await prisma.agentJob.updateMany({
      where: { id: job.id, status: "RUNNING", leaseToken: job.leaseToken },
      data: { status: "COMPLETED", leaseToken: null, leaseUntil: null, finishedAt: new Date() },
    });
    if (!changed.count) throw new Error("AGENT_JOB_LEASE_LOST");
  },

  async fail(job: AgentJob, code: string) {
    const terminal = job.attempts >= job.maxAttempts;
    const changed = await prisma.agentJob.updateMany({
      where: { id: job.id, status: "RUNNING", leaseToken: job.leaseToken },
      data: terminal
        ? { status: "FAILED", leaseToken: null, leaseUntil: null, finishedAt: new Date(), errorCode: code, errorMessage: "Agent execution failed after bounded retries." }
        : { status: "QUEUED", leaseToken: null, leaseUntil: null, runAfter: new Date(Date.now() + Math.min(300_000, 15_000 * 2 ** Math.max(0, job.attempts - 1))), errorCode: code, errorMessage: "Agent execution will be retried." },
    });
    if (!changed.count) throw new Error("AGENT_JOB_LEASE_LOST");
  },

  async heartbeat(job: AgentJob) {
    await prisma.agentJob.updateMany({ where: { id: job.id, status: "RUNNING", leaseToken: job.leaseToken }, data: { leaseUntil: new Date(Date.now() + AGENT_LEASE_MS) } });
  },
};

