import express from "express";
import protect from "../middleware/auth.middleware.js";
import {
  bookmarkMessage,
  getBookmarks
} from "../controllers/bookmark.controller.js";

const router = express.Router();

router.post("/:messageId", protect, bookmarkMessage);

router.get("/", protect, getBookmarks);

export default router;
