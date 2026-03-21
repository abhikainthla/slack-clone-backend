import express from "express";
import protect from "../middleware/auth.middleware.js";
import { sendDM, getDMs } from "../controllers/dm.controller.js";

const router = express.Router();

router.post("/", protect, sendDM);
router.get("/:userId", protect, getDMs);

export default router;
