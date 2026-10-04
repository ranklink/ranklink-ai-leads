export interface CampaignConfig {
  keyword: string; location: string; offer: string; senderName: string; qualificationCriteria: string;
  limit: number; minimumScore: number; website: "ANY" | "HAS_WEBSITE" | "NO_WEBSITE";
  intervalHours: number | null; maxAiCalls: number; maxGoogleCalls: number;
  mode: "DRAFT_ONLY" | "AUTO_SEND"; maxDailySends: number; minQualificationConfidence: number; minContactConfidence: number;
  requireVerifiedContact: boolean; followUpEnabled: boolean;
}
export interface Campaign { id: string; name: string; config: CampaignConfig; version: number; status: "DRAFT" | "ACTIVE" | "PAUSED"; nextRunAt: string | null; createdAt: string; _count?: { runs: number } }
export interface Page<T> { items: T[]; total: number; page: number; limit: number }
export interface RunSummary { id: string; campaignId: string; status: "QUEUED" | "RUNNING" | "WAITING" | "COMPLETED" | "FAILED" | "CANCELLED"; stage: string; attempts: number; aiCalls: number; googleCalls: number; createdAt: string; finishedAt: string | null; errorMessage: string | null; campaign: { name: string }; _count?: { assessments: number } }
export interface Evidence { id: string; fact: string; sourceUrl: string | null; observedAt: string }
export interface Assessment { id: string; status: "PENDING" | "REVIEW" | "APPROVED" | "REJECTED" | "ERROR"; decision: string | null; reason: string | null; subject: string | null; body: string | null; version: number; source: string | null; evidence: Evidence[] | null; toolTrace: string[] | null; approvedAt: string | null; lead: { id: string; name: string; leadScore: number; googleMapsUrl: string | null } }
export interface RunDetail extends RunSummary { config: CampaignConfig; campaignVersion: number; assessments: Assessment[]; events: { id: string; type: string; message: string; createdAt: string }[] }
