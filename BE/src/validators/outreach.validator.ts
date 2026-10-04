import { z } from "zod";

export const outreachPreviewSchema = z.object({
  recipientEmail: z.string().email().optional(),
  recipientName: z.string().trim().max(100).optional(),
});

export const outreachSendSchema = z.object({
  recipientEmail: z.string().email(),
  recipientName: z.string().trim().max(100).optional(),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(10000),
});
