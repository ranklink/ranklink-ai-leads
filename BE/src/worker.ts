import "dotenv/config";
import { setTimeout as sleep } from "node:timers/promises";
import prisma from "./config/database";
import { authContext } from "./auth/context";
import { campaignConfigSchema } from "./validators/campaign.validator";
import { campaignRepository } from "./repositories/campaign.repository";
import { runRepository } from "./repositories/run.repository";
import { executeWorkflow } from "./services/automation/workflow";
import { RunStopped, BudgetExceeded, LEASE_MS, nextSchedule } from "./services/automation/policy";
import { agentJobRepository } from "./repositories/agent-job.repository";
import { executeAgentJob, finalizeParentRun } from "./services/agents/agent-workflow.service";
import { processDueFollowUps } from "./services/agents/agent-workflow.service";
import { pollTelegramUpdates, processDueTelegramUpdate } from "./services/telegram.service";

let stopping = false;
process.on("SIGTERM", () => { stopping = true; });
process.on("SIGINT", () => { stopping = true; });

async function schedule() {
  const due = await prisma.campaign.findMany({ where: { status: "ACTIVE", nextRunAt: { lte: new Date() } }, take: 20 });
  for (const campaign of due) {
    const config = campaignConfigSchema.parse(campaign.config);
    await authContext.run({ organizationId: campaign.organizationId, userId: "worker", role: "ADMIN" }, async () => {
      try {
        await campaignRepository.enqueue(campaign.id, `schedule:${campaign.nextRunAt!.toISOString()}`);
        await prisma.campaign.updateMany({ where: { id: campaign.id, status: "ACTIVE", nextRunAt: campaign.nextRunAt }, data: { nextRunAt: nextSchedule(config.intervalHours) } });
      } catch (error) {
        if (!(error instanceof Error && "statusCode" in error && error.statusCode === 409)) throw error;
      }
    });
  }
}

async function main() {
  console.log(JSON.stringify({ event: "worker_started", mode: "draft_and_auto_send", aiProvider: process.env.AI_PROVIDER || "template" }));
  while (!stopping) {
    try {
      await schedule();
      await processDueFollowUps();
      await pollTelegramUpdates();
      await processDueTelegramUpdate();
      const run = await runRepository.claim();
      if (!run) {
        const job = await agentJobRepository.claim();
        if (!job) { await sleep(2000); continue; }
        const heartbeat = setInterval(() => { void agentJobRepository.heartbeat(job).catch(() => console.error(JSON.stringify({ event: "agent_heartbeat_failed", jobId: job.id }))); }, 20_000);
        try {
          await authContext.run({ organizationId: job.organizationId, userId: "worker", role: "ADMIN" }, () => executeAgentJob(job));
          await agentJobRepository.complete(job);
          await finalizeParentRun(job);
        } catch (error) {
          const code = error instanceof Error && /^[A-Z0-9_]+$/.test(error.message) ? error.message : "AGENT_EXECUTION_FAILED";
          await agentJobRepository.fail(job, code);
          console.error(JSON.stringify({ event: "agent_job_failed", jobId: job.id, type: job.type, code }));
        } finally { clearInterval(heartbeat); }
        continue;
      }
      const heartbeat = setInterval(() => {
        void prisma.automationRun.updateMany({ where: { id: run.id, leaseToken: run.leaseToken, status: "RUNNING", leaseUntil: { gt: new Date() } }, data: { leaseUntil: new Date(Date.now() + LEASE_MS) } }).catch(() => console.error(JSON.stringify({ event: "heartbeat_failed", runId: run.id })));
      }, 20_000);
      try {
        await authContext.run({ organizationId: run.campaign.organizationId, userId: "worker", role: "ADMIN" }, () => executeWorkflow(run));
      } catch (error) {
        if (!(error instanceof RunStopped)) {
          const code = error instanceof BudgetExceeded ? "BUDGET_EXHAUSTED" : "WORKFLOW_FAILED";
          await prisma.automationRun.updateMany({ where: { id: run.id, leaseToken: run.leaseToken, status: "RUNNING" }, data: { status: "FAILED", leaseToken: null, leaseUntil: null, finishedAt: new Date(), errorCode: code, errorMessage: code === "BUDGET_EXHAUSTED" ? "Run reached its configured provider call budget. Completed work has been saved." : "Workflow stopped. Check provider configuration and availability, then retry the saved run." } });
          console.error(JSON.stringify({ event: "workflow_failed", runId: run.id, code }));
        }
      } finally { clearInterval(heartbeat); }
    } catch (error) {
      const errorCode = error instanceof Error && /^[A-Z0-9_]+$/.test(error.message) ? error.message : "WORKER_POLL_FAILED";
      console.error(JSON.stringify({ event: "worker_poll_failed", errorCode }));
      await sleep(5000);
    }
  }
}
main().catch(() => { process.exitCode = 1; }).finally(() => prisma.$disconnect());
