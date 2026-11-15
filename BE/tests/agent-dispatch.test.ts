import assert from "node:assert/strict";
import test from "node:test";
import type { AgentJob, AgentType } from "@prisma/client";
import { AGENT_JOB_TYPES, dispatchAgentJob, type AgentJobExecutors } from "../src/services/agents/agent-job-dispatch";

function makeJob(type: AgentType): AgentJob {
  const now = new Date("2026-01-01T00:00:00.000Z");
  return {
    id: `job-${type.toLowerCase()}`,
    organizationId: "org_test",
    leadId: null,
    automationRunId: null,
    assessmentId: null,
    type,
    status: "QUEUED",
    idempotencyKey: `test:${type.toLowerCase()}`,
    inputJson: {},
    attempts: 0,
    maxAttempts: 3,
    runAfter: now,
    leaseToken: null,
    leaseUntil: null,
    errorCode: null,
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
    finishedAt: null,
  };
}

test("dispatcher registers and routes every supported agent type", async () => {
  const executors: AgentJobExecutors = {
    RESEARCH: async () => "RESEARCH",
    QUALIFICATION: async () => "QUALIFICATION",
    CONTACT_ENRICHMENT: async () => "CONTACT_ENRICHMENT",
    OUTREACH: async () => "OUTREACH",
    FOLLOW_UP: async () => "FOLLOW_UP",
    ANALYTICS: async () => "ANALYTICS",
  };
  assert.deepEqual(Object.keys(executors).sort(), [...AGENT_JOB_TYPES].sort());
  for (const type of AGENT_JOB_TYPES) assert.equal(await dispatchAgentJob(makeJob(type), executors), type);
});
