import Message from "../models/Message.js";
import ChannelMember from "../models/ChannelMember.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";

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

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        message: "Message not found",
      });
    }

    message.reactions.push({
      user: req.user._id,
      emoji,
    });

    await message.save();

    res.json(message);

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

    const result = await cloudinary.uploader.upload_stream(
      { resource_type: "auto" },
      (error, result) => {
        if (error) {
          return res.status(500).json({ error });
        }

        res.json({
          url: result.secure_url
        });
      }
    );

  } catch (error) {
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

    const message = await Message.findByIdAndUpdate(
      messageId,
      { pinned: true },
      { new: true }
    );

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
    );

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
          readAt: new Date()
        }
      }
    },
    { new: true }
  );

  res.json(message);
};
