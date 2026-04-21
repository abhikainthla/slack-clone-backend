import express from "express";
import protect from "../middleware/auth.middleware.js";
import {
  createWorkspace,
  deleteWorkspace,
  demoteMember,
  generateInviteLink,
  getUserWorkspaces,
  getWorkspaceById,
  getWorkspaceMembers,
  joinWorkspace,
  promoteMember,
  removeMember,
  updateMemberRole,
  updateWorkspace,
} from "../controllers/workspace.controller.js";
import { checkWorkspaceRole } from "../middleware/workspaceRole.middleware.js";

const router = express.Router();

// workspaceRoutes.js
router.post("/", protect, createWorkspace);
router.get("/", protect, getUserWorkspaces);

// ADMIN-ONLY ROUTES 
router.put("/:id", protect, checkWorkspaceRole(["admin"]), updateWorkspace);  
router.delete("/:id", protect, checkWorkspaceRole(["admin"]), deleteWorkspace); 
router.delete("/:id/members/:userId", protect, checkWorkspaceRole(["admin"]), removeMember); 
router.put(
  "/:id/members/:userId/role",
  protect,
  checkWorkspaceRole(["admin"]),
  updateMemberRole
);

router.put("/:id/promote/:userId", protect, checkWorkspaceRole(["admin"]), promoteMember);
router.put("/:id/demote/:userId", protect, checkWorkspaceRole(["admin"]), demoteMember);


// OTHER ROUTES
router.get("/:id", protect, getWorkspaceById);
router.post("/:workspaceId/invite-link", protect, generateInviteLink);
router.post("/join/:token", protect, joinWorkspace);
router.get("/:id/members", protect, getWorkspaceMembers);





export default router;
