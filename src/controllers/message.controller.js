import Message from "../models/Message.js";
import ChannelMember from "../models/ChannelMember.js";

/* SEND MESSAGE */
export const sendMessage = async (req, res) => {
  try {

    const { channelId, content } = req.body;

    if (!channelId || !content) {
      return res.status(400).json({
        message: "channelId and content required",
      });
    }

    const message = await Message.create({
      channel: channelId,
      sender: req.user._id,
      content,
    });

    const populatedMessage = await message.populate(
      "sender",
      "name email avatar"
    );

    res.status(201).json(populatedMessage);

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
        message: "Message not found",
      });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Not authorized to edit",
      });
    }

    message.content = content;
    await message.save();

    res.json(message);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
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