import express from "express";
import protect from "../middleware/auth.middleware.js";
import {
  getAllUsers,
  updateProfile,
  updateStatus,
  getUserById,
  searchUsers,
  uploadAvatar,
  selectAvatar,
  completeOnboarding,
} from "../controllers/user.controller.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.get("/", protect, getAllUsers);
router.get("/search", protect, searchUsers);
router.get("/profile", protect, (req, res) => res.json(req.user));
router.get("/:id", protect, getUserById);

router.put("/profile", protect, updateProfile);
router.put("/status", protect, updateStatus);
router.post("/avatar/upload", protect, upload.single("avatar"), uploadAvatar);
router.post("/avatar/select", protect, selectAvatar);
router.post("/onboarding", protect, completeOnboarding);

export default router;

