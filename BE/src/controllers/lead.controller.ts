import { Request, Response } from "express";
import { searchLeadsSchema, leadFilterSchema } from "../validators/lead-search.validator";
import { searchService } from "../services/search.service";
import { leadService } from "../services/lead.service";
import { ApiError } from "../utils/api-error";

export async function searchLeads(req: Request, res: Response) {
  const parsed = searchLeadsSchema.parse(req.body);
  const result = await searchService.searchLeads(parsed);
  res.json({ success: true, data: result });
}

export async function getLeads(req: Request, res: Response) {
  const parsed = leadFilterSchema.parse(req.query);
  const result = await leadService.getLeads(parsed);
  res.json({ success: true, data: result });
}

export async function getLeadById(req: Request, res: Response) {
  const { id } = req.params;
  const lead = await leadService.getLeadById(id);
  if (!lead) throw new ApiError(404, "Lead not found");
  res.json({ success: true, data: lead });
}

export async function exportLeads(req: Request, res: Response) {
  const parsed = leadFilterSchema.parse(req.query);
  // For export we ignore pagination, use filters only
  const csv = await leadService.exportCsv(parsed);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="leads.csv"');
  res.send(csv);
}
