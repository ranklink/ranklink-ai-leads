import type { RunSummary } from "@/types/automation";

export type AgentStageId = "discovery" | "qualification" | "drafting" | "review";
export type AgentPresence = "working" | "queued" | "review" | "ready" | "loading" | "unknown";

export interface AgentStage {
  id: AgentStageId;
  name: string;
  role: string;
  color: string;
  description: string;
}

export const AGENT_STAGES: AgentStage[] = [
  { id: "discovery", name: "Discovery", role: "Finds local prospects", color: "#4c7df0", description: "Searches Google Places for businesses that match an active campaign." },
  { id: "qualification", name: "Qualification", role: "Checks fit and evidence", color: "#19a87b", description: "Reviews business details against campaign criteria and records supporting evidence." },
  { id: "drafting", name: "Drafting", role: "Prepares relevant outreach", color: "#e9933d", description: "Creates a reviewable draft for leads that meet the campaign rules." },
  { id: "review", name: "Human review", role: "Keeps decisions in your hands", color: "#9664d8", description: "Routes decisions and drafts for approval before any configured outreach." },
];

export interface AgentStageState extends AgentStage {
  presence: AgentPresence;
  latestRun?: RunSummary;
}

function getStageId(stage: string): AgentStageId | undefined {
  const normalized = stage.toUpperCase();
  if (normalized.includes("DISCOVERY") || normalized.includes("SEARCH")) return "discovery";
  if (normalized.includes("QUALIFICATION") || normalized.includes("QUALIFY")) return "qualification";
  if (normalized.includes("OUTREACH") || normalized.includes("DRAFT")) return "drafting";
  if (normalized.includes("REVIEW") || normalized.includes("WAITING")) return "review";
  return undefined;
}

export function getAgentStageStates(runs: RunSummary[] = [], dataState: "ready" | "loading" | "unknown" = "ready"): AgentStageState[] {
  return AGENT_STAGES.map((agent) => {
    if (dataState !== "ready") return { ...agent, presence: dataState };
    const stageRuns = runs.filter((run) => getStageId(run.stage) === agent.id);
    const activeRuns = stageRuns.filter((run) => run.status === "RUNNING");
    const queuedRuns = stageRuns.filter((run) => run.status === "QUEUED" || run.status === "WAITING");
    const presence: AgentPresence = activeRuns.length > 0
      ? "working"
      : queuedRuns.length > 0
        ? agent.id === "review" ? "review" : "queued"
        : "ready";
    return {
      ...agent,
      presence,
      latestRun: stageRuns[0],
    };
  });
}
