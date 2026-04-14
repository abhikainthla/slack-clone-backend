import Message from "../models/Message.js";
import ChannelMember from "../models/ChannelMember.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import cloudinary from "../utils/cloudinary.js";
import Channel from "../models/Channel.js";
import fs from "fs";
import Conversation from "../models/Conversation.js";
/* SEND MESSAGE */
export const sendMessage = async (req, res) => {
  try {
    const { channelId, receiverId, content, files, mentions } = req.body;

    let conversationId = null;

    if (!channelId && !receiverId) {
    return res.status(400).json({
      message: "channelId or receiverId required",
    });
  }
    /* ================= MENTIONS ================= */
    let mentionedUsers = [];

    if (Array.isArray(mentions) && mentions.length > 0) {
      const users = await User.find({
        name: { $in: mentions },
      });

      mentionedUsers = users.map((u) => u._id);
    }



    /* ================= DM ================= */
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

    /* ================= CREATE MESSAGE ================= */
    const message = await Message.create({
      sender: req.user._id,
      content,
      files: files || [],
      mentions: mentionedUsers,
      channel: channelId || null,
      conversation: conversationId,
    });

    if (channelId) {
  await Channel.findByIdAndUpdate(channelId, {
    lastMessage: message._id,
  });
}


    /* ================= POPULATE ================= */
    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "name avatar _id")
      .lean();

    /* ================= EMIT MENTIONS (FIXED) ================= */
    if (mentionedUsers.length > 0) {
      mentionedUsers.forEach((id) => {
        req.io.to(id.toString()).emit("mentioned", {
          message: populatedMessage,
        });
      });
    }

    /* ================= SOCKET ================= */
    if (channelId) {
      req.io.to(channelId).emit("receive_message", populatedMessage);
    } else {
      req.io.to(receiverId.toString()).emit("receive_dm", populatedMessage);
      req.io.to(req.user._id.toString()).emit("receive_dm", populatedMessage);
    }

    res.status(201).json(populatedMessage);

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

    /* ================= CHANNEL ================= */
    if (channelId) {
      query = {
        channel: channelId,
        parentMessage: null,
      };
    }

    /* ================= DM ================= */
    else if (userId) {
      const conversation = await Conversation.findOne({
        members: { $all: [req.user._id, userId] },
      });

      if (!conversation) return res.json([]);

      query = {
        conversation: conversation._id,
      };
    } else {
      return res.status(400).json({
        message: "channelId or userId required",
      });
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
      const convo = await Conversation.findById(message.conversation._id);
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
      .populate("channel", "_id");

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
      return res.status(404).json({
        message: "Message not found"
      });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Not authorized"
      });
    }

    await message.save();

/* ✅ POPULATE UPDATED MESSAGE */
const updatedMessage = await Message.findById(message._id)
  .populate("sender", "name avatar _id");

/* ✅ EMIT SOCKET */
if (message.channel) {
  req.io.to(message.channel.toString()).emit("message_updated", updatedMessage);
} else if (message.conversation) {
  const convo = await Conversation.findById(message.conversation);
  convo.members.forEach((id) => {
    req.io.to(id.toString()).emit("message_updated", updatedMessage);
  });
}

res.json(updatedMessage);


    /* SAVE OLD VERSION */
    message.editHistory.push({
      content: message.content,
      editedAt: new Date()
    });

    message.content = content;
    message.edited = true;

    await message.save();

    res.json(message);

  } catch (error) {
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

    const member = await ChannelMember.findOneAndUpdate(
      {
        channel: channelId,
        user: req.user._id,
      },
      {
        lastReadMessage: messageId,
      },
      { new: true }
    );


// emit to channel
req.io.to(channelId).emit("notifications_read", {
  channelId,
  userId: req.user._id,
});


    res.json(member);
  } catch (error) {
    console.error("❌ markChannelRead error:", error);
    res.status(500).json({ message: error.message });
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
      const convo = await Conversation.findById(message.conversation._id);
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
      const convo = await Conversation.findById(message.conversation._id);
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
    )
      .populate("channel", "_id")
      .populate("conversation");

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // ✅ FIX: handle BOTH channel + DM
    if (message.channel) {
      req.io.to(message.channel._id.toString()).emit("message_read_update", {
        messageId,
        userId: req.user._id,
      });
    } else if (message.conversation) {
      message.conversation.members.forEach((memberId) => {
        req.io.to(memberId.toString()).emit("message_read_update", {
          messageId,
          userId: req.user._id,
        });
      });
    }

    res.json(message);
  } catch (error) {
    console.error("❌ READ ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};




