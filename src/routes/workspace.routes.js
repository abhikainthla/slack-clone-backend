import express from "express";
import protect from "../middleware/auth.middleware.js";
import {
  acceptInvite,
  createWorkspace,
  deleteWorkspace,
  filterChannels,
  getUserWorkspaces,
  getWorkspaceById,
  inviteToWorkspace,
  markWorkspaceRead,
  removeMember,
  updateWorkspace,
} from "../controllers/workspace.controller.js";
import { checkWorkspaceRole } from "../middleware/workspaceRole.middleware.js";

const router = express.Router();

// workspaceRoutes.js - CORRECT ORDER
router.post("/", protect, createWorkspace);
router.get("/", protect, getUserWorkspaces);

// ADMIN-ONLY ROUTES (move these UP)
router.put("/:id", protect, checkWorkspaceRole(["admin"]), updateWorkspace);  // ✅ FIXED
router.delete("/:id", protect, checkWorkspaceRole(["admin"]), deleteWorkspace); // ✅ FIXED
router.delete("/:id/members/:userId", protect, checkWorkspaceRole(["admin"]), removeMember); // ✅ FIXED

// OTHER ROUTES
router.get("/:id", protect, getWorkspaceById);
router.post("/invite/:workspaceId", protect, inviteToWorkspace);
router.get("/invite/:token", protect, acceptInvite);
router.put("/:id/mark-read", protect, markWorkspaceRead);
router.get("/:id/filter", protect, filterChannels);





export default router;
