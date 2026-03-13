import express from "express";
import protect from "../middleware/auth.middleware.js";
import {
  createWorkspace,
  getUserWorkspaces,
  getWorkspaceById,
} from "../controllers/workspace.controller.js";

const router = express.Router();

router.post("/", protect, createWorkspace);
router.get("/", protect, getUserWorkspaces);
router.get("/:id", protect, getWorkspaceById);

export default router;
