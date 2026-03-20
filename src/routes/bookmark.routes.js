import express from "express";
import protect from "../middleware/auth.middleware.js";
import {
  toggleBookmark,
  getBookmarks
} from "../controllers/bookmark.controller.js";

const router = express.Router();

/* TOGGLE BOOKMARK (ADD / REMOVE) */
router.post("/:messageId", protect, toggleBookmark);

/* GET ALL BOOKMARKS */
router.get("/", protect, getBookmarks);

export default router;
