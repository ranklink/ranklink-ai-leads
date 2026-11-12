import type { AgentType, Prisma } from "@prisma/client";

const VERSIONED_JOB_TYPES = new Set<AgentType>(["RESEARCH", "QUALIFICATION", "OUTREACH", "FOLLOW_UP"]);
const OUTPUT_TYPES_WITH_SIDE_EFFECTS = new Set<AgentType>(["OUTREACH", "FOLLOW_UP", "ANALYTICS"]);

export function nextAgentJobInput(type: AgentType, input: Prisma.JsonValue, version: number): Prisma.InputJsonValue {
  if (!VERSIONED_JOB_TYPES.has(type)) return input as Prisma.InputJsonValue;
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("AGENT_JOB_INPUT_INVALID");
  return { ...input, version } as Prisma.InputJsonObject;
}

export function usesVersionedAgentOutput(type: AgentType): boolean {
  return VERSIONED_JOB_TYPES.has(type);
}

export function requiresManualOutputReview(type: AgentType): boolean {
  return OUTPUT_TYPES_WITH_SIDE_EFFECTS.has(type);
}
