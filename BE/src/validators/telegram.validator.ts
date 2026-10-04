import { z } from "zod";

export const telegramWebhookUpdateSchema = z.object({
  update_id: z.number().int().nonnegative(),
  message: z.object({
    message_id: z.number().int(),
    chat: z.object({ id: z.union([z.number().int(), z.string()]) }),
    from: z.object({ id: z.union([z.number().int(), z.string()]), username: z.string().max(64).optional() }).optional(),
    text: z.string().max(4096).optional(),
  }).optional(),
}).passthrough();

export const telegramWebhookSchemaToken = z.string().min(32).max(256).regex(/^[A-Za-z0-9_-]+$/);
