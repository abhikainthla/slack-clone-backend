// middleware/workspaceRole.middleware.js
import mongoose from "mongoose";
import Workspace from "../models/Workspace.js";

export const checkWorkspaceRole = (roles) => {
  return async (req, res, next) => {
    try {
      console.log("Checking role for workspace:", req.params.id); // Debug
      
      // Verify Workspace model is loaded
      if (typeof Workspace === 'undefined' || !Workspace.findById) {
        console.error("❌ Workspace model not loaded!");
        return res.status(500).json({ message: "Server configuration error" });
      }

      const workspace = await Workspace.findById(req.params.id)
        .populate("members.user", "name email")
        .populate("owner", "name email");

      if (!workspace) {
        return res.status(404).json({ message: "Workspace not found" });
      }

      const member = workspace.members.find(
        (m) => m.user && m.user._id.toString() === req.user._id.toString()
      );

      if (!member || !roles.includes(member.role)) {
        return res.status(403).json({ 
          message: `Admin access required. Your role: ${member?.role || 'none'}` 
        });
      }

      req.workspace = workspace;
      next();
    } catch (error) {
      console.error(" Role check error:", error);
      res.status(500).json({ message: "Server error during role check" });
    }
  };
};
