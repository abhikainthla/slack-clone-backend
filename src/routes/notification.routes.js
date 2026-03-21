import express from "express";
import protect from "../middleware/auth.middleware.js";
import { getNotifications, markWorkspaceNotificationsRead } from "../controllers/notification.controller.js";

const router = express.Router();

router.get("/", protect, getNotifications);
router.put("/read/:workspaceId", protect, markWorkspaceNotificationsRead);


export default router;
