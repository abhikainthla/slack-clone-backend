import express from "express";
import protect from "../middleware/auth.middleware.js";
import {
  toggleBookmark,
  getBookmarks,
  updateBookmarkSection,
  createCollection,
  getCollections,
  addToCollection
} from "../controllers/bookmark.controller.js";

const router = express.Router();

/* COLLECTION ROUTES FIRST */
router.post("/collections", protect, createCollection);
router.get("/collections", protect, getCollections);
router.post("/collections/:id/add", protect, addToCollection);

/* BOOKMARK ROUTES AFTER */
router.post("/:messageId", protect, toggleBookmark);
router.get("/", protect, getBookmarks);
router.patch("/:id", protect, updateBookmarkSection);



export default router;
