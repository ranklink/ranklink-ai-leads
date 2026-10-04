import { Request, Response } from "express";
import { nicheSuggestionService } from "../services/niche-suggestion.service";
import { z } from "zod";

const querySchema = z.object({
  location: z.string().trim().max(200).optional().default(""),
  limit: z.coerce.number().int().min(1).max(30).optional().default(12),
  competition: z.enum(["LOW", "MEDIUM", "HIGH", "low", "medium", "high"]).optional(),
});

export async function suggestNiches(req: Request, res: Response) {
  const parsed = querySchema.parse(req.query);
  const result = await nicheSuggestionService.suggest({
    location: parsed.location ?? "",
    limit: parsed.limit,
    minCompetition: parsed.competition,
  });
  res.json({ success: true, data: result });
}
