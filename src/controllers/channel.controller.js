import Channel from "../models/Channel.js";
import Workspace from "../models/Workspace.js";
import ChannelMember from "../models/ChannelMember.js";
import { enrichChannel } from "../utils/enrichChannel.js";
import User from "../models/User.js";


/* ---------------- CREATE CHANNEL ---------------- */

export const createChannel = async (req, res) => {
  try {
    const { name, workspaceId, isPrivate, members = [] } = req.body;
    const userId = req.user._id;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    const me = workspace.members.find(
      (m) => m.user.toString() === userId.toString()
    );

    if (!me) {
      return res.status(403).json({ message: "Not a workspace member" });
    }

    if (isPrivate && me.role !== "admin") {
      return res.status(403).json({
        message: "Only admins can create private channels",
      });
    }

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

    const channelMembers = [
      {
        channel: channel._id,
        user: userId,
      },
    ];

    if (isPrivate && members.length > 0) {
      const workspaceUserIds = workspace.members.map((m) =>
        m.user.toString()
      );

      const validUsers = await User.find({
        _id: {
          $in: members.filter((id) =>
            workspaceUserIds.includes(id)
          ),
        },
      });

      channelMembers.push(
        ...validUsers.map((u) => ({
          channel: channel._id,
          user: u._id,
        }))
      );
    }

    await ChannelMember.insertMany(channelMembers, { ordered: false });

    if (req.io) {
      req.io.to(workspaceId).emit("channel_created", {
        ...channel.toObject(),
        role: me.role,
      });

    }

    res.status(201).json({
      ...channel.toObject(),
      role: me.role, 
    });

  } catch (err) {
    console.error("CREATE CHANNEL ERROR:", err);
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
        role: workspaceMember?.role || "member"
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
    const userId = req.user._id;

    await ChannelMember.findOneAndDelete({
      channel: channelId,
      user: userId,
    });

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
const channel = await Channel.findById(channelId);
if (!channel) {
  return res.status(404).json({ message: "Channel not found" });
}

const workspace = await Workspace.findById(channel.workspace);
if (!workspace) {
  return res.status(404).json({ message: "Workspace not found" });
}


const isWorkspaceMember = workspace.members.some(
  (m) => m.user.toString() === userId
);

if (!isWorkspaceMember) {
  return res.status(400).json({ message: "User not in workspace" });
}


const me = workspace.members.find(
  (m) => m.user.toString() === req.user._id.toString()
);

if (!me || !["admin", "moderator"].includes(me.role)) {
  return res.status(403).json({ message: "Not allowed" });
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
    req.io.to(channel.workspace.toString()).emit("channel_members_updated", {
      channelId,
      add: [userId],
      remove: [],
    });


    res.json({ message: "User added to channel" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


/* ---------------- UPDATE CHANNEL ---------------- */

export const updateChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const updates = req.body;

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    const workspace = await Workspace.findById(channel.workspace);

    const me = workspace.members.find(
      (m) => m.user.toString() === req.user._id.toString()
    );

    if (!me || me.role !== "admin") {
      return res.status(403).json({ message: "Admins only" });
    }

    // ✅ APPLY UPDATES
    Object.assign(channel, updates);
    await channel.save();

    // ✅ SOCKET (THIS IS THE KEY FIX)
    req.io.to(channel.workspace.toString()).emit("channel_updated", {
      channelId,
      updates, // must match frontend
    });

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

    const role = workspaceMember?.role;

    if (!role) return res.status(403).json({ message: "Not allowed" });

    // permissions
    if (name && !["admin", "moderator"].includes(role)) {
      return res.status(403).json({ message: "Rename not allowed" });
    }

    if (typeof isPrivate !== "undefined" && role !== "admin") {
      return res.status(403).json({ message: "Only admins can change privacy" });
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
      req.io.to(channel.workspace.toString()).emit("channel_updated", {
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





export const updateChannelMembers = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { add = [], remove = [], addByEmail = [] } = req.body;
    const userId = req.user._id;

    const channel = await Channel.findById(channelId);
    const workspace = await Workspace.findById(channel.workspace);

    if (!channel) {
  return res.status(404).json({ message: "Channel not found" });
}

if (!workspace) {
  return res.status(404).json({ message: "Workspace not found" });
}



    const member = workspace.members.find(
      (m) => m.user.toString() === req.user._id.toString()
    );

    if (!member || !["admin", "moderator"].includes(member.role)) {
      return res.status(403).json({ message: "Not allowed" });
    }


    /* ➕ BUILD MEMBERS */
    const newMembers = add.map((id) => ({
      channel: channelId,
      user: id,
    }));

    for (const email of addByEmail) {
      const user = await User.findOne({ email });
      if (!user) continue;

      newMembers.push({
        channel: channelId,
        user: user._id,
      });
    }

    /* ✅ SAFE INSERT */
    for (const newMember of newMembers) {
  const exists = await ChannelMember.findOne({
    channel: channelId,
    user: newMember.user,
  });

  if (!exists) {
    await ChannelMember.create(newMember);
  }
}


    /* ❌ REMOVE */
    await ChannelMember.deleteMany({
      channel: channelId,
      user: { $in: remove },
    });

    req.io.to(channel.workspace.toString()).emit("channel_members_updated", {
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
    if (!workspace) {
  return res.status(404).json({ message: "Workspace not found" });
}


    const workspaceMember = workspace.members.find(
      (m) => m.user.toString() === userId.toString()
    );

    const isWorkspaceAdmin = workspaceMember?.role === "admin";

    const channelMember = await ChannelMember.findOne({
      channel: channelId,
      user: userId,
    });


    if (!isWorkspaceAdmin) {
      return res.status(403).json({
        message: "Only workspace admin can delete",
      });
    }


    // ✅ cleanup members (important)
    await ChannelMember.deleteMany({ channel: channelId });

    await Channel.findByIdAndDelete(channelId);
    req.io.to(channel.workspace.toString()).emit("channel_deleted", {
      channelId,
    });


    res.json({ message: "Channel deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Delete failed" });
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
   const formatted = members
  .filter(m => m.user) 
  .map(m => ({
    ...m.user,
    _id: m.user._id,
  }))

console.log("CHANNEL MEMBERS:", formatted);

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const addChannelMember = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { email } = req.body;

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    const workspace = await Workspace.findById(channel.workspace);

    const me = workspace.members.find(
      (m) => m.user.toString() === req.user._id.toString()
    );

    if (!me || !["admin", "moderator"].includes(me.role)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const exists = await ChannelMember.findOne({
      channel: channelId,
      user: user._id,
    });

    if (exists) {
      return res.status(400).json({ message: "Already a member" });
    }

    await ChannelMember.create({
      channel: channelId,
      user: user._id,
    });

    // 🔥 SOCKET (instant UI sync)
    req.io.to(channel.workspace.toString()).emit("channel_members_updated", {
      channelId,
      add: [user._id],
      remove: [],
    });

    res.json({
      message: "Member added",
      user, 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export const removeChannelMember = async (req, res) => {
  try {
    const { channelId, memberId } = req.params;

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    const workspace = await Workspace.findById(channel.workspace);

    const me = workspace.members.find(
      (m) => m.user.toString() === req.user._id.toString()
    );

    if (!me || !["admin", "moderator"].includes(me.role)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    await ChannelMember.findOneAndDelete({
      channel: channelId,
      user: memberId,
    });

    req.io.to(channel.workspace.toString()).emit("channel_members_updated", {
      channelId,
      add: [],
      remove: [memberId],
    });

    res.json({ message: "Member removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
