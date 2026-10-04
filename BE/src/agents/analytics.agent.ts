import type { AgentJob } from "@prisma/client";
import { executeStructuredAgent } from "./core/structured-agent";
import { analyticsInputSchema, analyticsOutputSchema, type AnalyticsInput } from "./schemas";

export async function runAnalyticsAgent(job: AgentJob, input: AnalyticsInput) {
  return executeStructuredAgent(job, input, {
    promptVersion: "analytics-v1",
    inputSchema: analyticsInputSchema,
    outputSchema: analyticsOutputSchema,
    systemPrompt: "You summarize supplied aggregate funnel metrics. Do not infer causality, change rules, expose personal data, or recommend higher send volume without evidence. Clearly distinguish observations from suggestions. Return JSON only.",
    fallback: value => ({ summary: `The reporting period contains ${value.metrics.leads ?? 0} leads and ${value.metrics.sent ?? 0} sent messages.`, recommendations: ["Review qualification and reply outcomes before changing automation thresholds."] }),
  });
}
