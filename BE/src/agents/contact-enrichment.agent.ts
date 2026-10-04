import type { AgentJob } from "@prisma/client";
import { executeStructuredAgent } from "./core/structured-agent";
import { contactEnrichmentInputSchema, contactEnrichmentOutputSchema, type ContactEnrichmentInput } from "./schemas";

export async function runContactEnrichmentAgent(job: AgentJob, input: ContactEnrichmentInput) {
  const output = await executeStructuredAgent(job, input, {
    promptVersion: "contact-enrichment-v1",
    inputSchema: contactEnrichmentInputSchema,
    outputSchema: contactEnrichmentOutputSchema,
    systemPrompt: "You are a bounded contact-enrichment ranking agent. Select only supplied provider candidates. Never generate or guess an email address. Prefer verified, high-confidence contacts with roles relevant to business purchasing. Return JSON only.",
    fallback: value => ({ contacts: [...value.candidates].sort((a, b) => b.confidence - a.confidence).slice(0, 10) }),
  });
  const candidates = new Set(input.candidates.map(item => item.email.toLowerCase()));
  if (output.contacts.some(item => !candidates.has(item.email.toLowerCase()))) throw new Error("UNSUPPORTED_CONTACT");
  return output;
}

