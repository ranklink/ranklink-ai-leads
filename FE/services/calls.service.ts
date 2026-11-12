import { apiRequest } from "./api";

export type CallOutcome = "STARTED" | "ANSWERED" | "NO_ANSWER" | "CALLBACK_REQUESTED" | "INTERESTED" | "NOT_INTERESTED" | "WRONG_NUMBER" | "DO_NOT_CALL";
export type CallActivity = { id: string; outcome: CallOutcome; notes: string | null; followUpAt: string | null; createdAt: string; phoneNumber: string };
export type CallProfileResponse = {
  profile: { status: "REVIEW_REQUIRED" | "ELIGIBLE" | "DO_NOT_CALL"; interestConfirmed: boolean; interestEvidence: string | null; doNotCallCheckedAt: string | null; timeZone: string | null } | null;
  activities: CallActivity[];
  phoneNumber: string | null;
  canCall: boolean;
  blockers: string[];
};

export const callsApi = {
  getProfile: (leadId: string) => apiRequest<{ success: true; data: CallProfileResponse }>(`/leads/${leadId}/calling-profile`).then(result => result.data),
  updateProfile: (leadId: string, payload: { eligible: boolean; interestConfirmed: boolean; interestEvidence?: string; doNotCallChecked: boolean; timeZone?: string }) => apiRequest(`/leads/${leadId}/calling-profile`, { method: "PUT", body: JSON.stringify(payload) }),
  logActivity: (leadId: string, payload: { outcome: CallOutcome; notes?: string; followUpAt?: string }) => apiRequest(`/leads/${leadId}/call-activities`, { method: "POST", body: JSON.stringify(payload) }),
};
