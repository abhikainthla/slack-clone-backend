import express from "express";
import protect from "../middleware/auth.middleware.js";

import {
  createChannel,
  getWorkspaceChannels,
  joinChannel,
  leaveChannel,
  updateChannel,
  deleteChannel,
  inviteToChannel,
  addModerator,
  removeModerator,
  getChannelMembers,
  updateChannelSettings,
  updateChannelMembers,
  updateChannelRole,
} from "../controllers/channel.controller.js";

const router = express.Router();

/* CREATE CHANNEL */
router.post("/", protect, createChannel);

/* GET CHANNELS BY WORKSPACE */
router.get("/workspace/:workspaceId", protect, getWorkspaceChannels);

/* UPDATE CHANNEL (rename / private/public) */
router.put("/:channelId", protect, updateChannel);

/* DELETE CHANNEL */
router.delete("/:channelId", protect, deleteChannel);

/* INVITE USER TO CHANNEL */
router.post("/invite/:channelId", protect, inviteToChannel);

/* JOIN CHANNEL */
router.post("/join/:channelId", protect, joinChannel);

/* LEAVE CHANNEL */
router.post("/leave/:channelId", protect, leaveChannel);

/* ADD MODERATOR */
router.post("/moderator/:channelId", protect, addModerator);

/* REMOVE MODERATOR */

router.delete("/moderator/:channelId", protect, removeModerator);

/* GET CHANNEL MEMBERS */
router.get("/:channelId/members", protect, getChannelMembers);

router.put("/:channelId/settings", protect, updateChannelSettings);
router.put("/:channelId/members", protect, updateChannelMembers);
router.put("/:channelId/role", protect, updateChannelRole);



export default router;
