import { Router } from "express";
import { callService } from "../services/call.service";
import { callActivitySchema, callProfileSchema } from "../validators/call.validator";
import { asyncHandler } from "../utils/async-handler";

const router = Router();

router.get("/leads/:id/calling-profile", asyncHandler(async (req, res) => {
  res.json({ success: true, data: await callService.getProfile(req.params.id) });
}));

router.put("/leads/:id/calling-profile", asyncHandler(async (req, res) => {
  const input = callProfileSchema.parse(req.body);
  res.json({ success: true, data: await callService.updateProfile(req.params.id, input) });
}));

router.post("/leads/:id/call-activities", asyncHandler(async (req, res) => {
  const input = callActivitySchema.parse(req.body);
  res.status(201).json({ success: true, data: await callService.logActivity(req.params.id, input) });
}));

export default router;
