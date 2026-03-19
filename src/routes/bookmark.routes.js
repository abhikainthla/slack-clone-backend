import express from "express";
import protect from "../middleware/auth.middleware.js";
import {
  bookmarkMessage,
  getBookmarks,
  removeBookmark
} from "../controllers/bookmark.controller.js";

const router = express.Router();

router.post("/:messageId", protect, bookmarkMessage);

router.get("/", protect, getBookmarks);

router.delete("/:messageId", protect, removeBookmark);

export default router;
