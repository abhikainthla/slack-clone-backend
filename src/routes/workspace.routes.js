import express from "express";
import protect from "../middleware/auth.middleware.js";
import {
  createWorkspace,
  deleteWorkspace,
  filterChannels,
  generateInviteLink,
  getUserWorkspaces,
  getWorkspaceById,
  joinWorkspace,
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
router.put("/:id", protect, checkWorkspaceRole(["admin"]), updateWorkspace);  
router.delete("/:id", protect, checkWorkspaceRole(["admin"]), deleteWorkspace); 
router.delete("/:id/members/:userId", protect, checkWorkspaceRole(["admin"]), removeMember); 

// OTHER ROUTES
router.get("/:id", protect, getWorkspaceById);
router.post("/:workspaceId/invite-link", protect, generateInviteLink);
router.post("/join/:token", protect, joinWorkspace);
router.put("/:id/mark-read", protect, markWorkspaceRead);
router.get("/:id/filter", protect, filterChannels);





export default router;
