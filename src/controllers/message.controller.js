import Message from "../models/Message.js";
import ChannelMember from "../models/ChannelMember.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import cloudinary from "../utils/cloudinary.js";
import fs from "fs";

/* SEND MESSAGE */
export const sendMessage = async (req, res) => {
  try {

    const { channelId, content } = req.body;

    const message = await Message.create({
      channel: channelId,
      sender: req.user._id,
      content,
    });

    /* MENTION DETECTION */
    const mentions = content.match(/@(\w+)/g);

    if (mentions) {

      for (let mention of mentions) {

        const username = mention.replace("@", "");

        const user = await User.findOne({ username });

        if (user) {

          await Notification.create({
            user: user._id,
            message: message._id,
            type: "mention",
          });

        }
      }
    }

    res.status(201).json(message);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


/* GET MESSAGES BY CHANNEL */
export const getChannelMessages = async (req, res) => {
  try {

    const { channelId } = req.params;

    const page = parseInt(req.query.page) || 1;
    const limit = 20;

    const skip = (page - 1) * limit;

    const messages = await Message.find({
      channel: channelId,
      parentMessage: null
    })
      .populate("sender", "name email avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json(messages);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


/* ADD REACTION */

export const addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

     const message = await Message.findById(messageId).populate("channel", "_id");

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

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

     req.io.to(message.channel._id.toString()).emit("reaction_update", {
      messageId: message._id,
      reactions: message.reactions,
      channelId: message.channel._id
    });

    // ✅ Populate sender for UI
    const populatedMessage = await Message.findById(messageId)
      .populate("sender", "name email avatar")
      .populate("channel", "_id");

    res.json(populatedMessage);
  } catch (error) {
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
    const { content } = req.body;

    const reply = await Message.create({
      channel: req.body.channelId,
      sender: req.user._id,
      content,
      parentMessage: messageId
    });

    res.status(201).json(reply);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
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

    console.log("✅ UPLOADED:", result.secure_url);

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

  const { channelId } = req.params;
  const { messageId } = req.body;

  const member = await ChannelMember.findOneAndUpdate(
    {
      channel: channelId,
      user: req.user._id
    },
    {
      lastReadMessage: messageId
    },
    { new: true }
  );

  res.json(member);
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
    
    // ✅ Populate channel and sender
    const message = await Message.findByIdAndUpdate(
      messageId,
      { pinned: true },
      { new: true }
    )
    .populate("channel", "_id")
    .populate("sender", "name email avatar");

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // ✅ Emit correct socket event
    req.io.to(message.channel._id.toString()).emit("pin_update", {
      messageId: message._id,
      pinned: true,
      channelId: message.channel._id
    });

    res.json(message);
  } catch (error) {
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
    .populate("sender", "name email avatar");

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    req.io.to(message.channel._id.toString()).emit("pin_update", {
      messageId: message._id,
      pinned: false,
      channelId: message.channel._id
    });

    res.json(message);
  } catch (error) {
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
  );


  //  emit socket event
    req.io.to(message.channel.toString()).emit("message_read_update", {
      messageId,
      userId: req.user._id,
    });


  res.json(message);
};

