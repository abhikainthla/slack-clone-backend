import Message from "../models/Message.js";
import ChannelMember from "../models/ChannelMember.js";
import User from "../models/User.js";
import cloudinary from "../utils/cloudinary.js";
import Channel from "../models/Channel.js";
import fs from "fs";
import Conversation from "../models/Conversation.js";
import mongoose from "mongoose";
import Notification from "../models/Notification.js";

/* SEND MESSAGE */
export const sendMessage = async (req, res) => {
  try {
    const { channelId, receiverId, content, files, mentions, clientId } = req.body;

    if (!channelId && !receiverId) {
      return res.status(400).json({ message: "channelId or receiverId required" });
    }

    if (!content && (!files || files.length === 0)) {
      return res.status(400).json({ message: "Message cannot be empty" });
    }

    let conversationId = null;

    // DM
    if (receiverId) {
      let conversation = await Conversation.findOne({
        members: { $all: [req.user._id, receiverId] },
      });

      if (!conversation) {
        conversation = await Conversation.create({
          members: [req.user._id, receiverId],
        });
      }

      conversationId = conversation._id;
    }

    // Mentions
    let mentionedUsers = [];
    if (Array.isArray(mentions) && mentions.length > 0) {
      const users = await User.find({ _id: { $in: mentions } });
      mentionedUsers = users.map((u) => u._id);
    }

    // Create message
    const message = await Message.create({
      sender: req.user._id,
      content,
      files: files || [],
      mentions: mentionedUsers,
      channel: channelId || null,
      conversation: conversationId,
      clientId,
    });

    if (channelId) {
      await Channel.findByIdAndUpdate(channelId, {
        lastMessage: message._id,
      });
    }

    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "name avatar _id")
      .lean();

    /* ================= NOTIFICATIONS ================= */

    const notificationMap = new Map();

    // CHANNEL
    if (channelId) {
      const members = await ChannelMember.find({
        channel: channelId,
        user: { $ne: req.user._id },
      });

      members.forEach((m) => {
        notificationMap.set(m.user.toString(), {
          user: m.user,
          type: "channel",
          channel: channelId,
        });
      });
    }

    // MENTIONS (override)
    mentionedUsers.forEach((id) => {
      if (id.toString() === req.user._id.toString()) return;

      notificationMap.set(id.toString(), {
        user: id,
        type: "mention",
        channel: channelId || null,
        conversation: conversationId || null,
      });
    });

    // DM
    if (receiverId && receiverId.toString() !== req.user._id.toString()) {
      notificationMap.set(receiverId.toString(), {
        user: receiverId,
        type: "dm",
        conversation: conversationId,
      });
    }

    const notificationsToInsert = Array.from(notificationMap.values()).map((n) => ({
      ...n,
      message: message._id,
    }));

    if (notificationsToInsert.length > 0) {
      const created = await Notification.insertMany(notificationsToInsert);

      created.forEach((n) => {
        req.io.to(n.user.toString()).emit("new_notification", {
          _id: n._id,
          type: n.type,
          read: false,
          message: populatedMessage,
          channel: n.channel || null,
          conversation: n.conversation || null,
          createdAt: n.createdAt,
        });
      });
    }

    /* ================= SOCKET MESSAGE ================= */

    if (channelId) {
      req.io.to(channelId).except(req.user._id.toString()).emit("receive_message", populatedMessage);
    } else {
      req.io.to(receiverId.toString()).emit("receive_dm", populatedMessage);
      req.io.to(req.user._id.toString()).emit("receive_dm", populatedMessage);
    }

    return res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("❌ SEND MESSAGE ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};






/* GET MESSAGES BY CHANNEL */
export const getMessages = async (req, res) => {
  try {
    const { channelId, userId } = req.query;

    let query = {};

    if (channelId) {
      query = {
        channel: channelId,
        parentMessage: null,
      };
    } else if (userId) {
      const conversation = await Conversation.findOne({
        members: { $all: [req.user._id, userId] },
      });

      if (!conversation) return res.json([]);

      query = { conversation: conversation._id };
    } else {
      return res.status(400).json({ message: "channelId or userId required" });
    }

    const messages = await Message.find(query)
      .populate("sender", "name avatar _id")
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    console.error("❌ GET MESSAGES ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};



/* ADD REACTION */

export const addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    const message = await Message.findById(messageId)
      .populate("channel", "_id")
      .populate("conversation"); // ✅ IMPORTANT

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.conversation && !message.conversation.members) {
      const convo = await Conversation.findById(message.conversation);
      message.conversation.members = convo.members;
    }

    /* ================= REACTION LOGIC ================= */
    const existingIndex = message.reactions.findIndex(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (existingIndex !== -1) {
      if (message.reactions[existingIndex].emoji === emoji) {
        message.reactions.splice(existingIndex, 1);
      } else {
        message.reactions[existingIndex].emoji = emoji;
      }
    } else {
      message.reactions.push({
        user: req.user._id,
        emoji,
      });
    }

    await message.save();

    /* ================= SOCKET ================= */
    if (message.channel) {
      req.io.to(message.channel._id.toString()).emit("reaction_update", {
        messageId: message._id,
        reactions: message.reactions,
        channelId: message.channel._id,
      });
    } else if (message.conversation?.members) {
      message.conversation.members.forEach((memberId) => {
        req.io.to(memberId.toString()).emit("reaction_update", {
          messageId: message._id,
          reactions: message.reactions,
        });
      });
    }

    const populatedMessage = await Message.findById(messageId)
      .populate("sender", "name avatar")
      .populate("reactions.user", "name avatar")
      .populate("channel", "_id")
      .lean();

populatedMessage.clientId = message.clientId;
    res.json(populatedMessage);
  } catch (error) {
    console.error("❌ REACTION ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};







/* EDIT MESSAGE */

export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // SAVE HISTORY FIRST
    message.editHistory.push({
      content: message.content,
      editedAt: new Date(),
    });

    message.content = content;
    message.edited = true;

    await message.save();

    const updatedMessage = await Message.findById(message._id)
      .populate("sender", "name avatar _id");

    // SOCKET
    if (message.channel) {
      req.io.to(message.channel.toString()).emit("message_updated", updatedMessage);
    } else if (message.conversation) {
      const convo = await Conversation.findById(message.conversation);
      convo.members.forEach((id) => {
        req.io.to(id.toString()).emit("message_updated", updatedMessage);
      });
    }

    res.json(updatedMessage);
  } catch (error) {
    console.error("❌ EDIT ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};


/* GET EDIT HISTORY */

export const getEditHistory = async (req, res) => {

  const { messageId } = req.params;

  const message = await Message.findById(messageId);

  res.json(message.editHistory);

};



/* REPLY TO MESSAGE */

export const replyToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content, channelId, receiverId } = req.body;

    let conversationId = null;

    if (receiverId) {
      let convo = await Conversation.findOne({
        members: { $all: [req.user._id, receiverId] },
      });

      if (!convo) {
        convo = await Conversation.create({
          members: [req.user._id, receiverId],
        });
      }

      conversationId = convo._id;
    }

    const reply = await Message.create({
      sender: req.user._id,
      content,
      parentMessage: messageId,
      channel: channelId || null,
      conversation: conversationId,
    });

    const populated = await Message.findById(reply._id)
      .populate("sender", "name avatar");

    //  SOCKET EMIT
    // prevent emitting twice
    if (channelId) {
      req.io.to(channelId).emit("receive_reply", populated);
    } else if (conversationId) {
      const convo = await Conversation.findById(conversationId);
      convo.members.forEach((id) => {
        if (id.toString() !== req.user._id.toString()) {
          req.io.to(id.toString()).emit("receive_reply", populated);
        }
      });
    }


    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getReplies = async (req, res) => {
  const { messageId } = req.params;

  const replies = await Message.find({
    parentMessage: messageId,
  })
    .populate("sender", "name avatar")
    .sort({ createdAt: 1 });

  res.json(replies);
};



/* UPLOAD FILES */

export const uploadFile = async (req, res) => {
  try {
    
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    //  UPLOAD TO CLOUDINARY
    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "auto",
      folder: "slack-clone",
    });

    console.log(" UPLOADED:", result.secure_url);

    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
      console.log("🗑️ Local file deleted");
    }

    res.json({
      url: result.secure_url,
      public_id: result.public_id,
    });
    
  } catch (error) {
    console.error("❌ UPLOAD ERROR:", error.message);
    
    // ✅ CLEANUP ON ERROR (sync)
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ message: error.message });
  }
};


/* MARK AS READ */
export const markChannelRead = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { messageId } = req.body;

    // ❗ FIX: validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
  return res.json({ success: false }); 
}


    const member = await ChannelMember.findOneAndUpdate(
      { channel: channelId, user: req.user._id },
      { lastReadMessage: messageId },
      { new: true }
    );

    await Message.updateMany(
      {
        channel: channelId,
        _id: { $lte: messageId },
        "readBy.user": { $ne: req.user._id },
      },
      {
        $addToSet: {
          readBy: {
            user: req.user._id,
            readAt: new Date(),
          },
        },
      }
    );

    req.io.to(channelId).emit("channel_read_update", {
      channelId,
      userId: req.user._id,
      messageId,
    });

    res.json(member);

  } catch (error) {
    console.error("❌ markChannelRead error:", error);
    res.status(500).json({ message: error.message });
  }
};



// MARK DM AS READ (FULL CONVERSATION)
export const markDMRead = async (req, res) => {
  try {
    const { userId } = req.params;

    const conversation = await Conversation.findOne({
      members: { $all: [req.user._id, userId] },
    });

    if (!conversation) {
      return res.status(404).json({ message: "No conversation" });
    }

    const lastMessage = await Message.findOne({
      conversation: conversation._id,
    }).sort({ createdAt: -1 });

    if (!lastMessage) return res.json({ success: true });

    conversation.lastRead = conversation.lastRead || new Map();
    conversation.lastRead.set(req.user._id.toString(), lastMessage._id);

    await conversation.save();

    req.io.to(req.user._id.toString()).emit("dm_read_update", {
      userId,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};






/* SEARCH MESSAGES */

export const searchMessages = async (req, res) => {
  try {

    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        message: "Search query required",
      });
    }

    const messages = await Message.find({
      $text: { $search: q }
    })
      .populate("sender", "name email avatar")
      .limit(20)
      .sort({ createdAt: -1 });

    res.json(messages);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


/* PIN MESSAGES */
export const pinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findByIdAndUpdate(
      messageId,
      { pinned: true },
      { new: true }
    )
      .populate("channel", "_id")
      .populate("sender", "name avatar")
      .populate("conversation"); // ✅ IMPORTANT

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    /* ✅ FIX: ensure members exist */
    if (message.conversation && !message.conversation.members) {
      const convo = await Conversation.findById(message.conversation);
      message.conversation.members = convo.members;
    }

    /* ================= SOCKET ================= */
    if (message.channel) {
      req.io.to(message.channel._id.toString()).emit("pin_update", {
        messageId: message._id,
        pinned: true,
        channelId: message.channel._id,
      });
    } else if (message.conversation?.members) {
      message.conversation.members.forEach((id) => {
        req.io.to(id.toString()).emit("pin_update", {
          messageId: message._id,
          pinned: true,
        });
      });
    }

    res.json(message);
  } catch (error) {
    console.error("❌ PIN ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};



/* UNPIN MESSAGES */
export const unpinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findByIdAndUpdate(
      messageId,
      { pinned: false },
      { new: true }
    )
      .populate("channel", "_id")
      .populate("sender", "name avatar")
      .populate("conversation"); // ✅ IMPORTANT

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    /* ✅ FIX: ensure members exist */
    if (message.conversation && !message.conversation.members) {
      const convo = await Conversation.findById(message.conversation);
      message.conversation.members = convo.members;
    }

    /* ================= SOCKET ================= */
    if (message.channel) {
      req.io.to(message.channel._id.toString()).emit("pin_update", {
        messageId: message._id,
        pinned: false,
        channelId: message.channel._id,
      });
    } else if (message.conversation?.members) {
      message.conversation.members.forEach((id) => {
        req.io.to(id.toString()).emit("pin_update", {
          messageId: message._id,
          pinned: false, // ✅ FIXED (was true ❌)
        });
      });
    }

    res.json(message);
  } catch (error) {
    console.error("❌ UNPIN ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};




/* GET ALL PINNED MESSAGES */
export const getPinnedMessages = async (req, res) => {
  try {

    const { channelId } = req.params;

    const messages = await Message.find({
      channel: channelId,
      pinned: true
    })
      .populate("sender", "name");

    res.json(messages);
  

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



/* MARK MESSAGE READ */
export const markMessageRead = async (req, res) => {
  try {
    const { messageId } = req.params;

    // ✅ ADD THIS
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: "Invalid messageId" });
    }

    const message = await Message.findByIdAndUpdate(
      messageId,
      {
        $addToSet: {
          readBy: {
            user: req.user._id,
            readAt: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // socket emit...
    res.json(message);

  } catch (error) {
    console.error("❌ READ ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// GET CHANNEL UNREAD COUNT
export const getChannelUnreadCounts = async (req, res) => {
  try {
    const memberships = await ChannelMember.find({
      user: req.user._id,
    });

    const result = {};

    for (const m of memberships) {
      const count = await Message.countDocuments({
        channel: m.channel,
        ...(m.lastReadMessage && { _id: { $gt: m.lastReadMessage } }),
      });

      result[m.channel.toString()] = count;
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



export const getOrCreateConversation = async (req, res) => {
  try {
    const otherUserId = req.params.userId;
    const currentUserId = req.user._id;

    let conversation = await Conversation.findOne({
      members: { $all: [currentUserId, otherUserId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        members: [currentUserId, otherUserId],
      });
    }

    res.json(conversation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export const getDMUnreadCounts = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      members: req.user._id,
    });

    const result = {};

    for (const convo of conversations) {
      const lastRead = convo.lastRead?.get(req.user._id.toString());

      const count = await Message.countDocuments({
        conversation: convo._id,
        ...(lastRead && { _id: { $gt: lastRead } }),
        sender: { $ne: req.user._id },
      });

      const otherUser = convo.members.find(
        (id) => id.toString() !== req.user._id.toString()
      );

      if (otherUser) {
        result[otherUser.toString()] = count;
      }
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


