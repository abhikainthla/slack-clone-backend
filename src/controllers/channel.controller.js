import Channel from "../models/Channel.js";
import Workspace from "../models/Workspace.js";
import ChannelMember from "../models/ChannelMember.js";
import { enrichChannel } from "../utils/enrichChannel.js";
import User from "../models/User.js";

/* ---------------- ROLE HELPERS (SAFE) ---------------- */

const isAdmin = (channel, userId) => {
  return (channel.roles?.admins || []).some(
    (id) => id.toString() === userId.toString()
  );
};

const isModerator = (channel, userId) => {
  return (channel.roles?.moderators || []).some(
    (id) => id.toString() === userId.toString()
  );
};

const isMember = (channel, userId) => {
  return (channel.members || []).some(
    (id) => id.toString() === userId.toString()
  );
};

const hasWorkspacePermission = (workspace, userId) => {
  const member = workspace.members.find(
    (m) => m.user.toString() === userId.toString()
  );

  return member && ["admin", "moderator"].includes(member.role);
};

/* ---------------- CREATE CHANNEL ---------------- */

export const createChannel = async (req, res) => {
  try {
    const { name, workspaceId, isPrivate, members = [] } = req.body;
    const userId = req.user._id;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });

    const me = workspace.members.find(
      (m) => m.user.toString() === userId.toString()
    );

    if (!me) {
      return res.status(403).json({ message: "Not a workspace member" });
    }

    /* 🔐 RULE: Private channel only ADMIN */
    if (isPrivate && me.role !== "admin") {
      return res.status(403).json({
        message: "Only admins can create private channels",
      });
    }

    /* 🔐 Public channel: admin/mod allowed */
    if (!["admin", "moderator"].includes(me.role)) {
      return res.status(403).json({
        message: "Not allowed to create channels",
      });
    }

    const channel = await Channel.create({
      name,
      workspace: workspaceId,
      createdBy: userId,
      isPrivate: !!isPrivate,
    });

    /* 👇 Create Channel Members */
    const channelMembers = [
      {
        channel: channel._id,
        user: userId,
        role: "admin",
      },
      ...members.map((id) => ({
        channel: channel._id,
        user: id,
        role: "member",
      })),
    ];

    await ChannelMember.insertMany(channelMembers);

    res.status(201).json(channel);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


/* ---------------- GET CHANNELS ---------------- */

export const getWorkspaceChannels = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user._id;

    const channels = await Channel.find({ workspace: workspaceId }).lean();

    const memberships = await ChannelMember.find({ user: userId }).lean();

    const workspace = await Workspace.findById(workspaceId);

    const workspaceMember = workspace.members.find(
      (m) => m.user.toString() === userId.toString()
    );

    const memberChannelIds = (memberships || []).map((m) =>
      m.channel?.toString()
    );

    const visibleChannels = channels.filter((ch) => {
      if (!ch.isPrivate) return true;
      return memberChannelIds.includes(ch._id.toString());
    });

    /* ✅ ENRICH WITH ROLE */
    const enriched = visibleChannels.map((ch) => {
      const membership = memberships.find(
        (m) => m.channel?.toString() === ch._id.toString()
      );

      return {
        ...ch,
        role:
          membership?.role || // channel-specific role
          (workspaceMember?.role === "admin"
            ? "admin"
            : workspaceMember?.role === "moderator"
            ? "moderator"
            : "member"),
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



/* ---------------- JOIN CHANNEL ---------------- */

export const joinChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.user._id;

    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ message: "Channel not found" });

    if (channel.isPrivate) {
      return res.status(403).json({
        message: "Private channel - invite required",
      });
    }

    const exists = await ChannelMember.findOne({
      channel: channelId,
      user: userId,
    });

    if (!exists) {
      await ChannelMember.create({
        channel: channelId,
        user: userId,
      });
    }

    res.json({ message: "Joined channel" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


/* ---------------- LEAVE CHANNEL ---------------- */

export const leaveChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.user._id.toString();

    const channel = await Channel.findById(channelId);

    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    channel.members = (channel.members || []).filter(
      (id) => id.toString() !== userId
    );

    channel.roles.admins = (channel.roles?.admins || []).filter(
      (id) => id.toString() !== userId
    );

    channel.roles.moderators = (channel.roles?.moderators || []).filter(
      (id) => id.toString() !== userId
    );

    await channel.save();

    res.json({ message: "Left channel" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------- INVITE TO CHANNEL ---------------- */
export const inviteToChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { userId } = req.body;

    const me = await ChannelMember.findOne({
      channel: channelId,
      user: req.user._id,
    });

    if (!me || !["admin", "moderator"].includes(me.role)) {
      return res.status(403).json({
        message: "Not allowed",
      });
    }

    const exists = await ChannelMember.findOne({
      channel: channelId,
      user: userId,
    });

    if (!exists) {
      await ChannelMember.create({
        channel: channelId,
        user: userId,
      });
    }

    res.json({ message: "User added to channel" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


/* ---------------- UPDATE CHANNEL ---------------- */

export const updateChannel = async (req, res) => {
  try {
    const { channelId } = req.params;

    const me = await ChannelMember.findOne({
      channel: channelId,
      user: req.user._id,
    });

    if (!me || me.role !== "admin") {
      return res.status(403).json({ message: "Admins only" });
    }

    const channel = await Channel.findByIdAndUpdate(
      channelId,
      req.body,
      { new: true }
    );

    res.json(channel);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export const updateChannelSettings = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { name, isPrivate } = req.body;
    const userId = req.user._id;

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    /* 🔥 GET WORKSPACE ROLE */
    const workspace = await Workspace.findById(channel.workspace);

    const workspaceMember = workspace.members.find(
      (m) => m.user.toString() === userId.toString()
    );

    const isWorkspaceAdmin = workspaceMember?.role === "admin";

    /* 🔥 GET CHANNEL ROLE */
    let me = await ChannelMember.findOne({
      channel: channelId,
      user: userId,
    });

    /* ✅ AUTO-ADD WORKSPACE ADMIN INTO CHANNEL */
    if (!me && isWorkspaceAdmin) {
      me = await ChannelMember.create({
        channel: channelId,
        user: userId,
        role: "admin",
      });
    }

    if (!me && !isWorkspaceAdmin) {
      return res.status(403).json({ message: "Not allowed" });
    }

    /* ---------------- PERMISSIONS ---------------- */

    // ✅ Rename allowed: workspace admin OR channel mod/admin
    if (
      name &&
      !isWorkspaceAdmin &&
      !["admin", "moderator"].includes(me?.role)
    ) {
      return res.status(403).json({ message: "Rename not allowed" });
    }

    // ✅ Privacy toggle allowed: workspace admin OR channel admin
    if (
      typeof isPrivate !== "undefined" &&
      !isWorkspaceAdmin &&
      me?.role !== "admin"
    ) {
      return res.status(403).json({
        message: "Only admins can change privacy",
      });
    }

    /* ---------------- APPLY UPDATES ---------------- */

    if (name) channel.name = name;

    if (typeof isPrivate !== "undefined") {
      channel.isPrivate = isPrivate;

      /* 🔥 EXTRA LOGIC (IMPORTANT UX FIX) */

      if (!isPrivate) {
        // 👉 If making PUBLIC → no need to remove members
        // anyone can join anyway
      } else {
        // 👉 If making PRIVATE → keep only current members
        // (optional: you can clean up here if needed)
      }
    }

    await channel.save();

    /* 🔥 SOCKET UPDATE */
    if (req.io) {
      req.io.to(channelId).emit("channel_updated", {
        channelId,
        updates: {
          name: channel.name,
          isPrivate: channel.isPrivate,
        },
      });
    }

    res.json(channel);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



export const updateChannelRole = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { userId, role } = req.body;

    const me = await ChannelMember.findOne({
      channel: channelId,
      user: req.user._id,
    });

    if (!me || me.role !== "admin") {
      return res.status(403).json({ message: "Admins only" });
    }

    await ChannelMember.findOneAndUpdate(
      { channel: channelId, user: userId },
      { role }
    );

    req.io.to(channelId).emit("channel_role_updated", {
      channelId,
      userId,
      role,
    });

    res.json({ message: "Role updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export const updateChannelMembers = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { add = [], remove = [], addByEmail = [] } = req.body;
    const userId = req.user._id;

    const me = await ChannelMember.findOne({
      channel: channelId,
      user: userId,
    });

    if (!me || !["admin", "moderator"].includes(me.role)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    /* ➕ ADD BY ID */
    const newMembers = add.map((id) => ({
      channel: channelId,
      user: id,
      role: "member",
    }));

    /* ➕ ADD BY EMAIL (🔥 NEW) */
    for (const email of addByEmail) {
      const user = await User.findOne({ email });

      if (!user) continue;

      newMembers.push({
        channel: channelId,
        user: user._id,
        role: "member",
      });
    }

    await ChannelMember.insertMany(newMembers);

    /* ❌ REMOVE */
    await ChannelMember.deleteMany({
      channel: channelId,
      user: { $in: remove },
    });

    req.io.to(channelId).emit("channel_members_updated", {
      channelId,
      add,
      remove,
    });

    res.json({ message: "Members updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};




/* ---------------- DELETE CHANNEL ---------------- */

export const deleteChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.user._id;

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    const workspace = await Workspace.findById(channel.workspace);

    const workspaceMember = workspace.members.find(
      (m) => m.user.toString() === userId.toString()
    );

    const isWorkspaceAdmin = workspaceMember?.role === "admin";

    const channelMember = await ChannelMember.findOne({
      channel: channelId,
      user: userId,
    });

    const isChannelAdmin = channelMember?.role === "admin";

    // ✅ FINAL PERMISSION
    if (!isWorkspaceAdmin && !isChannelAdmin) {
      return res.status(403).json({
        message: "Only workspace admin or channel admin can delete",
      });
    }

    // ✅ cleanup members (important)
    await ChannelMember.deleteMany({ channel: channelId });

    await Channel.findByIdAndDelete(channelId);

    res.json({ message: "Channel deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Delete failed" });
  }
};



/* ---------------- ADD MODERATOR ---------------- */

export const addModerator = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { userId } = req.body;
    const currentUserId = req.user._id;

    const channel = await Channel.findById(channelId);

    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    if (!isAdmin(channel, currentUserId)) {
      return res.status(403).json({ message: "Admins only" });
    }

    if (!isModerator(channel, userId)) {
      channel.roles.moderators.push(userId);
      await channel.save();
    }

    res.json({ message: "User promoted to moderator" });
  } catch (err) {
    res.status(500).json({ message: "Failed" });
  }
};

/* ---------------- REMOVE MODERATOR ---------------- */

export const removeModerator = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { userId } = req.body;
    const currentUserId = req.user._id;

    const channel = await Channel.findById(channelId);

    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    if (!isAdmin(channel, currentUserId)) {
      return res.status(403).json({ message: "Admins only" });
    }

    channel.roles.moderators = (channel.roles?.moderators || []).filter(
      (id) => id.toString() !== userId
    );

    await channel.save();

    res.json({ message: "Moderator removed" });
  } catch (err) {
    res.status(500).json({ message: "Failed" });
  }
};



export const getChannelMembers = async (req, res) => {
  try {
    const { channelId } = req.params;

    const members = await ChannelMember.find({ channel: channelId })
      .populate("user", "_id name email username avatar") // 👈 include avatar
      .lean();

    if (!members || members.length === 0) {
      return res.status(404).json({ message: "Members not found" });
    }

    // Flatten the response so the frontend gets a clean list
    const formatted = members.map(m => ({
      ...m.user,
      role: m.role,   // from ChannelMember
      _id: m.user._id,
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


const handleRoleChange = async (id, newRole) => {
  try {
    if (!activeChannel.isPrivate) {
      // 🌍 PUBLIC → treat as workspace role update
      await updateWorkspaceMemberRole(activeChannel.workspace, {
        userId: id,
        role: newRole,
      });
    } else {
      // 🔐 PRIVATE → channel role
      await updateChannelRole(activeChannel._id, {
        userId: id,
        role: newRole,
      });
    }

    toast.success(`Role updated`);
  } catch (err) {
    toast.error("Permission denied");
  }
};
