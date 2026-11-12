import { z } from "zod";

export const callProfileSchema = z.object({
  eligible: z.boolean(),
  interestConfirmed: z.boolean(),
  interestEvidence: z.string().trim().max(1000).optional(),
  doNotCallChecked: z.boolean(),
  timeZone: z.string().trim().max(100).optional(),
}).strict();

export const callActivitySchema = z.object({
  outcome: z.enum(["STARTED", "ANSWERED", "NO_ANSWER", "CALLBACK_REQUESTED", "INTERESTED", "NOT_INTERESTED", "WRONG_NUMBER", "DO_NOT_CALL"]),
  notes: z.string().trim().max(1000).optional(),
  followUpAt: z.string().datetime().optional(),
}).strict();
