import Workspace from "../models/Workspace.js";
import crypto from "crypto";
import Invitation from "../models/Invitation.js";
import { sendEmail } from "../utils/sendEmail.js";

/* CREATE WORKSPACE */
export const createWorkspace = async (req, res) => {
  try {

    const { name } = req.body || {};

    if (!name) {
      return res.status(400).json({
        message: "Workspace name is required",
      });
    }

    const workspace = await Workspace.create({
      name,
      owner: req.user._id,
      members: [
        {
          user: req.user._id,
          role: "admin",
        },
      ],
    });

    res.status(201).json(workspace);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


/* GET USER WORKSPACES */
export const getUserWorkspaces = async (req, res) => {
  try {

    const workspaces = await Workspace.find({
      "members.user": req.user._id,
    })
      .populate("owner", "name email")
      .populate("members.user", "name email");

    res.json(workspaces);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* GET SINGLE WORKSPACE */
export const getWorkspaceById = async (req, res) => {
  try {

    const workspace = await Workspace.findById(req.params.id)
      .populate("owner", "name email")
      .populate("members.user", "name email");

    if (!workspace) {
      return res.status(404).json({
        message: "Workspace not found",
      });
    }

    res.json(workspace);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


/* INVITE TO WORKSPACE */

export const inviteToWorkspace = async (req, res) => {

  const { email } = req.body;
  const { workspaceId } = req.params;

  const token = crypto.randomBytes(32).toString("hex");

  const invite = await Invitation.create({
    email,
    workspace: workspaceId,
    invitedBy: req.user._id,
    token
  });

  const inviteLink = `${process.env.FRONTEND_URL}/invite/${token}`;

  await sendEmail(
    email,
    "Workspace Invitation",
    `<p>You were invited to join a workspace.</p>
     <a href="${inviteLink}">Accept Invitation</a>`
  );

  res.json({ message: "Invitation sent" });

};