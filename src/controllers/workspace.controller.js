import Workspace from "../models/Workspace.js";
import crypto from "crypto";
import Invitation from "../models/Invitation.js";
import { sendEmail } from "../utils/sendEmail.js";
import Notification from "../models/Notification.js";
import Channel from "../models/Channel.js";


/* CREATE WORKSPACE */
export const createWorkspace = async (req, res) => {
  try {


const { name, description, color } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Workspace name is required",
      });
    }

const workspace = await Workspace.create({
  name,
  description,
  color,
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
  try {
    const { email } = req.body;
    const { workspaceId } = req.params;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const token = crypto.randomBytes(32).toString("hex");

    const invite = await Invitation.create({
      email,
      workspace: workspaceId,
      invitedBy: req.user._id,
      token,
    });

    const inviteLink = `${process.env.FRONTEND_URL}/invite/${token}`;

    // 🔥 wrap email in try-catch
    try {
      await sendEmail(
        email,
        "Workspace Invitation",
        `<p>You were invited to join a workspace.</p>
         <a href="${inviteLink}">Accept Invitation</a>`
      );
    } catch (emailErr) {
      console.error("Email error:", emailErr.message);
      // still allow invite creation
    }

    res.json({ message: "Invitation sent", invite });

  } catch (error) {
    console.error("Invite error:", error); // 🔥 LOG THIS
    res.status(500).json({ message: error.message });
  }
};



/* ACCEPT WORKSPACE */
export const acceptInvite = async (req, res) => {
  try {
    const invite = await Invitation.findOne({ token: req.params.token });

    if (!invite || invite.accepted) {
      return res.status(400).json({ message: "Invalid invite" });
    }

    const workspace = await Workspace.findById(invite.workspace);

    workspace.members.push({
      user: req.user._id,
      role: "member",
    });

    await workspace.save();

    invite.accepted = true;
    await invite.save();

    res.json({ message: "Joined workspace" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


/* REMOVE MEMBER */
export const removeMember = async (req, res) => {
  try {
    const { id, userId } = req.params;

    const workspace = await Workspace.findById(id);

    workspace.members = workspace.members.filter(
      (m) => m.user.toString() !== userId
    );

    await workspace.save();

    res.json({ message: "Member removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



/* UPDATE WORKSPACE */
export const updateWorkspace = async (req, res) => {
  try {
    const { name, description, color } = req.body;

    const workspace = await Workspace.findByIdAndUpdate(
      req.params.id,
      { name, description, color },
      { new: true }
    );

    res.json(workspace);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


/* DELETE WORKSPACE */
export const deleteWorkspace = async (req, res) => {
  try {
    await Workspace.findByIdAndDelete(req.params.id);
    res.json({ message: "Workspace deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


/* MARK WORKSPACE AS READ*/
export const markWorkspaceRead = async (req, res) => {
  try {
    await Notification.updateMany(
      {
        user: req.user._id,
      },
      { read: true }
    );

    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


/* FILTER CHANNELS*/
export const filterChannels = async (req, res) => {
  const { type, sort } = req.query;

  let channels = await Channel.find({
    workspace: req.params.id,
  });

  if (sort === "az") {
    channels.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (sort === "recent") {
    channels.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  res.json(channels);
};
