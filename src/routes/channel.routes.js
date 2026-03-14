import express from "express";
import protect from "../middleware/auth.middleware.js";

import {
  createChannel,
  getWorkspaceChannels,
  joinChannel,
  leaveChannel,
} from "../controllers/channel.controller.js";

const router = express.Router();

/* CREATE CHANNEL */
router.post("/", protect, createChannel);

/* GET CHANNELS BY WORKSPACE */
router.get("/workspace/:workspaceId", protect, getWorkspaceChannels);

/* JOIN CHANNEL */
router.post("/join/:channelId", protect, joinChannel);

/* LEAVE CHANNEL */
router.post("/leave/:channelId", protect, leaveChannel);

export default router;
