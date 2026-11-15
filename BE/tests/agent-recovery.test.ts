import assert from "node:assert/strict";
import test from "node:test";
import { buildAnalyticsMetricFilters } from "../src/services/agents/analytics-metric-filters";
import { nextAgentJobInput, requiresManualOutputReview } from "../src/services/agents/agent-job-retry";

test("analytics filters retain organization and period scoping for org-wide reports", () => {
  const filters = buildAnalyticsMetricFilters({ organizationId: "org_1", periodStart: new Date("2026-01-01T00:00:00Z"), periodEnd: new Date("2026-02-01T00:00:00Z"), campaignId: null, campaignRunIds: null });
  assert.deepEqual(filters.leads, { organizationId: "org_1", createdAt: { gte: new Date("2026-01-01T00:00:00Z"), lte: new Date("2026-02-01T00:00:00Z") } });
  assert.deepEqual(filters.failedJobs, { organizationId: "org_1", createdAt: { gte: new Date("2026-01-01T00:00:00Z"), lte: new Date("2026-02-01T00:00:00Z") }, status: "FAILED" });
});

test("campaign analytics filters every metric to the selected automation runs", () => {
  const filters = buildAnalyticsMetricFilters({ organizationId: "org_1", periodStart: new Date("2026-01-01T00:00:00Z"), periodEnd: new Date("2026-02-01T00:00:00Z"), campaignId: "campaign_1", campaignRunIds: ["run_1"] });
  assert.deepEqual(filters.leads.OR, [{ assessments: { some: { runId: { in: ["run_1"] } } } }, { agentJobs: { some: { inputJson: { path: "campaignId", equals: "campaign_1" } } } }]);
  assert.deepEqual(filters.qualifications.job?.is, { OR: [{ automationRunId: { in: ["run_1"] } }, { assessment: { is: { runId: { in: ["run_1"] } } } }, { inputJson: { path: "campaignId", equals: "campaign_1" } }] });
  assert.deepEqual(filters.drafts.job?.is, { OR: [{ automationRunId: { in: ["run_1"] } }, { assessment: { is: { runId: { in: ["run_1"] } } } }, { inputJson: { path: "campaignId", equals: "campaign_1" } }] });
  assert.deepEqual(filters.sent.draft?.is.job?.is, { OR: [{ automationRunId: { in: ["run_1"] } }, { assessment: { is: { runId: { in: ["run_1"] } } } }, { inputJson: { path: "campaignId", equals: "campaign_1" } }] });
  assert.deepEqual(filters.failedJobs.OR, [{ automationRunId: { in: ["run_1"] } }, { assessment: { is: { runId: { in: ["run_1"] } } } }, { inputJson: { path: "campaignId", equals: "campaign_1" } }]);
});

test("campaign with no runs produces filters that cannot leak organization-wide metrics", () => {
  const filters = buildAnalyticsMetricFilters({ organizationId: "org_1", periodStart: new Date("2026-01-01T00:00:00Z"), periodEnd: new Date("2026-02-01T00:00:00Z"), campaignId: "campaign_1", campaignRunIds: [] });
  assert.deepEqual(filters.leads.OR, [{ assessments: { some: { runId: { in: [] } } } }, { agentJobs: { some: { inputJson: { path: "campaignId", equals: "campaign_1" } } } }]);
  assert.deepEqual(filters.failedJobs.OR, [{ automationRunId: { in: [] } }, { assessment: { is: { runId: { in: [] } } } }, { inputJson: { path: "campaignId", equals: "campaign_1" } }]);
});

test("retry allocates a fresh lead output version only to versioned agent types", () => {
  const input = { version: 3, campaignId: "campaign_1", researchId: "research_1" };
  assert.deepEqual(nextAgentJobInput("QUALIFICATION", input, 4), { version: 4, campaignId: "campaign_1", researchId: "research_1" });
  assert.deepEqual(nextAgentJobInput("CONTACT_ENRICHMENT", { version: 3 }, 4), { version: 3 });
});

test("retry blocks regeneration of side-effecting agent outputs after a partial failure", () => {
  assert.equal(requiresManualOutputReview("OUTREACH"), true);
  assert.equal(requiresManualOutputReview("FOLLOW_UP"), true);
  assert.equal(requiresManualOutputReview("ANALYTICS"), true);
  assert.equal(requiresManualOutputReview("RESEARCH"), false);
});
