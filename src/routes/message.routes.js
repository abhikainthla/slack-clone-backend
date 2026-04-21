import express from "express";
import protect from "../middleware/auth.middleware.js";

import {
  sendMessage,
  addReaction,
  editMessage,
  replyToMessage,
  uploadFile,
  markChannelRead,
  searchMessages,
  pinMessage,
  unpinMessage,
  getPinnedMessages,
  getEditHistory,
  markMessageRead,
  getMessages,
  getReplies,
  getOrCreateConversation,
  markDMRead,
} from "../controllers/message.controller.js";
import upload from "../middleware/upload.js";

const router = express.Router();

/* SEND MESSAGE */
router.post("/", protect, sendMessage);

/* SEARCH MESSAGES */
router.get("/search", protect, searchMessages);


/* GET MESSAGES */
router.get("/", protect, getMessages);


/* ADD REACTIONS */
router.post("/reaction/:messageId", protect, addReaction);

/* EDIT MESSAGE */
router.put("/:messageId", protect, editMessage);

/* REPLY TO MESSAGE */
router.post("/reply/:messageId", protect, replyToMessage);

/* GET REPLIES */
router.get("/replies/:messageId", protect, getReplies);

/* UPLOAD FILES */
router.post("/upload", upload.single("file"), uploadFile);

/* MARK CHANNEL AS READ */
router.post("/read/:channelId", protect, markChannelRead);

/* PIN MESSAGES */
router.put("/pin/:messageId", protect, pinMessage);


/* UNPIN MESSAGES */
router.put("/unpin/:messageId", protect, unpinMessage);


/* GET ALL PINNED MESSAGES */
router.get("/pinned/:channelId", protect, getPinnedMessages);

/* GET EDIT HISTORY */
router.get("/history/:messageId", protect, getEditHistory);

/* MARK MESSAGE READ */
router.put("/read-message/:messageId", protect, markMessageRead);


router.get("/conversations/:userId", protect, getOrCreateConversation);

router.post("/read/dm/:userId", protect, markDMRead);



export default router;
