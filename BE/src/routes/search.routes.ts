import { Router } from "express";
import { asyncHandler } from "../utils/async-handler";
import * as searchController from "../controllers/search.controller";

const router = Router();

router.get("/", asyncHandler(searchController.getSearches));
router.get("/:id", asyncHandler(searchController.getSearchById));

export default router;
