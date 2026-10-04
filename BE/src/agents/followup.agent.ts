import type { AgentJob } from "@prisma/client";
import { executeStructuredAgent } from "./core/structured-agent";
import { followUpInputSchema, followUpOutputSchema, type FollowUpInput } from "./schemas";

export async function runFollowUpAgent(job: AgentJob, input: FollowUpInput) {
  return executeStructuredAgent(job, input, {
    promptVersion: "follow-up-v1",
    inputSchema: followUpInputSchema,
    outputSchema: followUpOutputSchema,
    systemPrompt: "You are a bounded B2B follow-up planner. Produce one respectful follow-up, at least 72 hours after the original message. Do not add new claims or pressure. Ask for no more than one action and include a clear way to decline. Return JSON only.",
    fallback: value => ({ waitHours: 96, subject: `Re: ${value.originalSubject}`.slice(0, 200), body: `Hello,\n\nI wanted to follow up on my earlier note. If this is not relevant, just let me know and I will close the loop.\n\n${value.senderName}`, reason: "A single low-pressure follow-up after four days." }),
  });
}

