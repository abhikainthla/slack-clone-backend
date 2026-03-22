import Channel from "../models/Channel.js";
import Workspace from "../models/Workspace.js";

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
    const { name, workspaceId, isPrivate } = req.body;

    /*  VALIDATION */
    if (!name || !workspaceId) {
      return res.status(400).json({
        message: "Channel name and workspaceId required",
      });
    }

    /*  FETCH WORKSPACE */
    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      return res.status(404).json({
        message: "Workspace not found",
      });
    }

    const userId = req.user._id;

    /*  CHECK USER ROLE IN WORKSPACE */
    const member = workspace.members.find(
      (m) => m.user.toString() === userId.toString()
    );

    if (!member) {
      return res.status(403).json({
        message: "You are not a member of this workspace",
      });
    }

    /*  ONLY ADMIN / MODERATOR CAN CREATE */
    if (!["admin", "moderator"].includes(member.role)) {
      return res.status(403).json({
        message: "Only admins or moderators can create channels",
      });
    }


    const existingChannel = await Channel.findOne({
      name: name.trim(),
      workspace: workspaceId,
    });

    if (existingChannel) {
      return res.status(400).json({
        message: "Channel with this name already exists",
      });
    }

    /*  CREATE CHANNEL */
    const channel = await Channel.create({
      name: name.trim(),
      workspace: workspaceId,
      createdBy: userId,
      members: [userId],
      isPrivate: isPrivate || false,
      roles: {
        admins: [userId], // creator becomes admin
        moderators: [],
      },
    });

    res.status(201).json(channel);
  } catch (error) {
    console.error("Create Channel Error:", error);
    res.status(500).json({
      message: "Failed to create channel",
    });
  }
};

/* ---------------- GET CHANNELS ---------------- */

export const getWorkspaceChannels = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user._id.toString();

    const channels = await Channel.find({
      workspace: workspaceId,
    })
      .populate("createdBy", "name email")
      .populate("members", "name email")
      .lean();

    const updatedChannels = channels.map((channel) => {
      const admins = channel.roles?.admins || [];
      const moderators = channel.roles?.moderators || [];

      let role = "member";

      if (admins.some((id) => id.toString() === userId)) {
        role = "admin";
      } else if (moderators.some((id) => id.toString() === userId)) {
        role = "moderator";
      }

      return {
        ...channel,
        roles: {
          admins,
          moderators,
        },
        role,
      };
    });

    res.json(updatedChannels);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------- JOIN CHANNEL ---------------- */

export const joinChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.user._id;

    const channel = await Channel.findById(channelId);

    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    if (channel.isPrivate) {
      return res.status(403).json({
        message: "Private channel - invite required",
      });
    }

    if (!isMember(channel, userId)) {
      channel.members.push(userId);
      await channel.save();
    }

    res.json(channel);
  } catch (error) {
    res.status(500).json({ message: error.message });
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

/* ---------------- UPDATE CHANNEL ---------------- */

export const updateChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { name, isPrivate } = req.body;
    const userId = req.user._id;

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    /* ✅ FETCH WORKSPACE */
    const workspace = await Workspace.findById(channel.workspace);

    if (!hasWorkspacePermission(workspace, userId)) {
      return res.status(403).json({
        message: "Only workspace admins/moderators can update channels",
      });
    }

    if (!isAdmin(channel, userId)) {
      return res.status(403).json({ message: "Admins only" });
    }

    if (name !== undefined) channel.name = name;
    if (isPrivate !== undefined) channel.isPrivate = isPrivate;

    await channel.save();

    res.json(channel);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Update failed" });
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

    /* ✅ FETCH WORKSPACE */
    const workspace = await Workspace.findById(channel.workspace);

    if (!hasWorkspacePermission(workspace, userId)) {
      return res.status(403).json({
        message: "Only workspace admins/moderators can delete channels",
      });
    }

    if (!isAdmin(channel, userId)) {
      return res.status(403).json({ message: "Admins only" });
    }

    await Channel.findByIdAndDelete(channelId);

    res.json({ message: "Channel deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Delete failed" });
  }
};


/* ---------------- INVITE USER ---------------- */

export const inviteToChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { userId } = req.body;
    const currentUserId = req.user._id;

    const channel = await Channel.findById(channelId);

    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    if (!isAdmin(channel, currentUserId) && !isModerator(channel, currentUserId)) {
      return res.status(403).json({
        message: "Admins or moderators only",
      });
    }

    if (!isMember(channel, userId)) {
      channel.members.push(userId);
      await channel.save();
    }

    res.json({ message: "User invited" });
  } catch (err) {
    res.status(500).json({ message: "Invite failed" });
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

    const channel = await Channel.findById(channelId)
      .populate("members", "username name email");

    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    res.json(channel.members); // ✅ only members
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
