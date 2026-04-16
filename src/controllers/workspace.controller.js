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
      .populate("members.user", "_id name email username avatar status");

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
      .populate("members.user", "_id name email username avatar status");

    if (!workspace) return res.status(404).json({ message: "Not found" });

    const member = workspace.members.find(
      (m) => m.user._id.toString() === req.user._id.toString()
    );

    res.json({
      ...workspace.toObject(),
      role: member?.role || "member", 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



/* GENERATE DISCORD-STYLE INVITE LINK */
export const generateInviteLink = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    // ✅ CHECK PERMISSION (ADMIN / MOD ONLY)
    const member = workspace.members.find(
      (m) => m.user.toString() === req.user._id.toString()
    );

    if (!member || !["admin", "moderator"].includes(member.role)) {
      return res.status(403).json({ message: "Not authorized to invite" });
    }

    //  BETTER TOKEN (more secure)
    const token = crypto.randomBytes(16).toString("hex");

    const invite = await Invitation.create({
      workspace: workspaceId,
      invitedBy: req.user._id,
      token,
    });

    res.status(201).json({
      message: "Invite link generated",
      inviteLink: `${process.env.FRONTEND_URL}/join/${token}`,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


/* JOIN WORKSPACE VIA LINK */
export const joinWorkspace = async (req, res) => {
  try {
    const { token } = req.params;

    console.log("JOIN TOKEN:", token);

    const invite = await Invitation.findOne({ token });

    console.log("FOUND INVITE:", invite);

    if (!invite) {
      return res.status(404).json({ message: "Invalid invite link" });
    }

    console.log("EXPIRES AT:", invite.expiresAt, "NOW:", new Date());

    if (invite.expiresAt < new Date()) {
      return res.status(400).json({ message: "Invite expired" });
    }

    const workspace = await Workspace.findById(invite.workspace);

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    const isMember = workspace.members.some(
      (m) => m.user.toString() === req.user._id.toString()
    );

    if (isMember) {
      return res.status(400).json({ message: "Already a member" });
    }

    workspace.members.push({
      user: req.user._id,
      role: "member",
    });

    await workspace.save();

    // 🔥 TEMP: COMMENT THIS
    // await Invitation.deleteOne({ _id: invite._id });

    res.json({
      message: "Joined successfully",
      workspaceId: workspace._id,
    });

  } catch (err) {
    console.error("JOIN ERROR:", err);
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


/* ---------------- UPDATE MEMBER ROLE ---------------- */
export const updateMemberRole = async (req, res) => {
  try {
    const { id: workspaceId, userId } = req.params;
    const { role } = req.body; // "admin" | "moderator" | "member"

    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    /*  CHECK CURRENT USER ROLE */
    const currentUser = workspace.members.find(
      (m) => m.user.toString() === req.user._id.toString()
    );

    if (!currentUser || currentUser.role !== "admin") {
      return res.status(403).json({
        message: "Only admins can change roles",
      });
    }

    /*  PREVENT SELF DEMOTION */
    if (req.user._id.toString() === userId) {
      return res.status(400).json({
        message: "You cannot change your own role",
      });
    }

    const member = workspace.members.find(
      (m) => m.user.toString() === userId
    );

    if (!member) {
      return res.status(404).json({
        message: "Member not found",
      });
    }

    member.role = role;

    await workspace.save();

    res.json({
      message: "Role updated",
      members: workspace.members,
    });
  } catch (err) {
    console.error("Role update error:", err);
    res.status(500).json({ message: "Failed to update role" });
  }};


  export const promoteMember = async (req, res) => {
    try {
      const { id, userId } = req.params;
      const workspace = await Workspace.findById(id);

      const memberIndex = workspace.members.findIndex(m => m.user.toString() === userId);
      
      if (memberIndex === -1) return res.status(404).json({ message: "Member not found" });

      workspace.members[memberIndex].role = "moderator";
      await workspace.save();

      res.json({ message: "User promoted" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };

export const demoteMember = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const workspace = await Workspace.findById(id);

    const memberIndex = workspace.members.findIndex(m => m.user.toString() === userId);
    
    if (memberIndex === -1) return res.status(404).json({ message: "Member not found" });

    workspace.members[memberIndex].role = "member";
    await workspace.save();

    res.json({ message: "User demoted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// ---------------- GET WORKSPACE MEMBERS ----------------
export const getWorkspaceMembers = async (req, res) => {
  try {
    const { id } = req.params;

    const workspace = await Workspace.findById(id)
      .populate("members.user", "_id name email username avatar") 
      .lean();

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    const formatted = workspace.members.map((m) => ({
      _id: m.user._id,
      name: m.user.name,
      email: m.user.email,
      username: m.user.username, // optional
      role: m.role,
      avatar: m.user.avatar,      
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};




