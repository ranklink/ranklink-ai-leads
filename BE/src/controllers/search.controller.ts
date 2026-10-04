import { Request, Response } from "express";
import { searchService } from "../services/search.service";
import { ApiError } from "../utils/api-error";

export async function getSearches(req: Request, res: Response) {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const result = await searchService.getSearches(page, limit);
  res.json({
    success: true,
    data: {
      items: result.items,
      pagination: result.pagination,
    },
  });
}

export async function getSearchById(req: Request, res: Response) {
  const { id } = req.params;
  const result = await searchService.getSearchById(id);
  if (!result) throw new ApiError(404, "Search not found");
  res.json({ success: true, data: result });
}
