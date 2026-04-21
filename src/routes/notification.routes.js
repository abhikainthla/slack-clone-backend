import express from "express";
import protect from "../middleware/auth.middleware.js";
import { getNotifications, markChannelNotificationsRead, markDMNotificationsRead} from "../controllers/notification.controller.js";

const router = express.Router();

router.get("/", protect, getNotifications);

router.post("/read/channel/:channelId", protect, markChannelNotificationsRead);
router.post("/read/dm/:conversationId", protect, markDMNotificationsRead);

export default router;
