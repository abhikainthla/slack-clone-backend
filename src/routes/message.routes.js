import express from "express";
import protect from "../middleware/auth.middleware.js";

import {
  sendMessage,
  getChannelMessages,
  addReaction,
  editMessage,
  replyToMessage,
  uploadFile,
  markChannelRead,
} from "../controllers/message.controller.js";
import upload from "../middleware/upload.js";

const router = express.Router();

/* SEND MESSAGE */
router.post("/", protect, sendMessage);

/* GET CHANNEL MESSAGES */
router.get("/:channelId", protect, getChannelMessages);

/* ADD REACTIONS */
router.post("/reaction/:messageId", protect, addReaction);

/* EDIT MESSAGE */
router.put("/:messageId", protect, editMessage);

/* REPLY TO MESSAGE */
router.post("/reply/:messageId", protect, replyToMessage);

/* UPLOAD FILES */
router.post("/upload", protect, upload.single("file"), uploadFile);

/* MARK CHANNEL AS READ */
router.post("/read/:channelId", protect, markChannelRead);


export default router;
