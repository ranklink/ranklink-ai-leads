import { Router } from "express";
import { asyncHandler } from "../utils/async-handler";
import * as outreachController from "../controllers/outreach.controller";

const router = Router();
router.post("/:id/email-preview", asyncHandler(outreachController.preview));
router.post("/:id/email-send", asyncHandler(outreachController.send));
export default router;
