export interface ParentRunFinalization {
  status: "COMPLETED" | "FAILED";
  stage: string;
  errorCode: string | null;
  errorMessage: string | null;
  eventType: "AGENTS_COMPLETED" | "AGENTS_FAILED";
  eventMessage: string;
}

export function getParentRunFinalization(activeJobs: number, failedJobType?: string): ParentRunFinalization | null {
  if (activeJobs > 0) return null;

  if (failedJobType) {
    return {
      status: "FAILED",
      stage: failedJobType,
      errorCode: "AGENT_JOBS_FAILED",
      errorMessage: "One or more agent jobs failed after bounded retries.",
      eventType: "AGENTS_FAILED",
      eventMessage: `Agent processing failed during ${failedJobType.toLowerCase().replaceAll("_", " ")}. Review the agent job errors before retrying.`,
    };
  }

  return {
    status: "COMPLETED",
    stage: "REVIEW",
    errorCode: null,
    errorMessage: null,
    eventType: "AGENTS_COMPLETED",
    eventMessage: "Research and qualification jobs completed. Leads are ready for review.",
  };
}
