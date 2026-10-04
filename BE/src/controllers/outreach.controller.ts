import { Request, Response } from "express";
import { leadService } from "../services/lead.service";
import { buildDeterministicDraft } from "../services/personalization.service";
import { rewriteWithNvidia } from "../services/nvidia.service";
import { verifyEmail } from "../services/hunter.service";
import { outreachPreviewSchema, outreachSendSchema } from "../validators/outreach.validator";
import { ApiError } from "../utils/api-error";
import { env } from "../config/env";

async function getDraft(id: string, recipientName?: string) {
  const lead = await leadService.getLeadById(id);
  if (!lead) throw ApiError.notFound("Lead not found");
  const draft = buildDeterministicDraft(lead, recipientName, process.env.OUTREACH_SENDER_NAME || "Your Name");
  return rewriteWithNvidia(draft, lead.name);
}

export async function preview(req: Request, res: Response) {
  const input = outreachPreviewSchema.parse(req.body);
  const draft = await getDraft(req.params.id, input.recipientName);
  const verification = input.recipientEmail ? await verifyEmail(input.recipientEmail) : null;
  res.json({ success: true, data: { ...draft, recipientEmail: input.recipientEmail || null, verification } });
}

export async function send(req: Request, res: Response) {
  void req; void res; void env; void outreachSendSchema;
  throw new ApiError(410, "Direct sending has been retired. Generate, review, and send an approved agent draft.");
}
