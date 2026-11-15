export type AgentType = "RESEARCH" | "QUALIFICATION" | "CONTACT_ENRICHMENT" | "OUTREACH" | "FOLLOW_UP" | "ANALYTICS";
export type AgentJobStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
export type AgentDraftStatus = "REVIEW" | "APPROVED" | "SENT" | "REJECTED";

export interface AgentRun {
  id: string;
  status: "SUCCEEDED" | "FAILED";
  model: string;
  promptVersion: string;
  outputJson: unknown;
  latencyMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  errorCode: string | null;
  createdAt: string;
}

export interface AgentJobSummary {
  id: string;
  type: AgentType;
  status: AgentJobStatus;
  assessmentId: string | null;
  automationRunId: string | null;
  attempts: number;
  maxAttempts: number;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  finishedAt: string | null;
  runs: AgentRun[];
}

export interface LeadResearchSnapshot {
  id: string;
  version: number;
  summary: string;
  signals: unknown;
  evidence: unknown;
  missingFields: unknown;
  confidence: number;
  createdAt: string;
}

export interface LeadQualification {
  id: string;
  version: number;
  score: number;
  fit: "LOW" | "MEDIUM" | "HIGH";
  reasons: unknown;
  risks: unknown;
  recommendedAction: string;
  confidence: number;
  rubricVersion: string;
  createdAt: string;
}

export interface LeadContact {
  id: string;
  name: string | null;
  email: string;
  role: string | null;
  source: string;
  confidence: number;
  verificationStatus: string | null;
  createdAt: string;
}

export interface AgentOutreachDraft {
  id: string;
  recipientEmail: string | null;
  recipientName: string | null;
  subject: string;
  body: string;
  version: number;
  status: AgentDraftStatus;
  createdAt: string;
}

export interface AgentFollowUpPlan {
  id: string;
  version: number;
  waitHours: number;
  dueAt: string;
  subject: string;
  body: string;
  reason: string;
  status: "PROPOSED" | "APPROVED" | "CANCELLED" | "COMPLETED";
  createdAt: string;
}

export interface LeadAgentSummary {
  researchSnapshots: LeadResearchSnapshot[];
  qualifications: LeadQualification[];
  contacts: LeadContact[];
  outreachDrafts: AgentOutreachDraft[];
  followUpPlans: AgentFollowUpPlan[];
  agentJobs: AgentJobSummary[];
}

export interface AgentJobDetail extends Omit<AgentJobSummary, "runs"> {
  updatedAt: string;
  runs: AgentRun[];
}

export interface QueuedAgentJob {
  id: string;
  status: AgentJobStatus;
}
