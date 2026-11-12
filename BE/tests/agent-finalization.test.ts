import assert from "node:assert/strict";
import test from "node:test";
import { getParentRunFinalization } from "../src/services/agents/parent-run-finalization";

test("does not finalize a parent while child agent jobs are active", () => {
  assert.equal(getParentRunFinalization(1), null);
  assert.equal(getParentRunFinalization(2, "RESEARCH"), null);
});

test("marks a parent failed when a child agent job reached terminal failure", () => {
  assert.deepEqual(getParentRunFinalization(0, "CONTACT_ENRICHMENT"), {
    status: "FAILED",
    stage: "CONTACT_ENRICHMENT",
    errorCode: "AGENT_JOBS_FAILED",
    errorMessage: "One or more agent jobs failed after bounded retries.",
    eventType: "AGENTS_FAILED",
    eventMessage: "Agent processing failed during contact enrichment. Review the agent job errors before retrying.",
  });
});

test("completes a parent when no active or failed child agent jobs remain", () => {
  assert.deepEqual(getParentRunFinalization(0), {
    status: "COMPLETED",
    stage: "REVIEW",
    errorCode: null,
    errorMessage: null,
    eventType: "AGENTS_COMPLETED",
    eventMessage: "Research and qualification jobs completed. Leads are ready for review.",
  });
});
