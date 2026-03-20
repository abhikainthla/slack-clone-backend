import Message from "../models/Message.js";

/* TOGGLE BOOKMARK */
export const toggleBookmark = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    // ✅ POPULATE channel to avoid undefined error
    const message = await Message.findById(messageId)
      .populate("channel", "_id")  // Just need channel ID
      .populate("sender", "name email avatar");

    if (!message) return res.status(404).json({ message: "Message not found" });

    const index = message.bookmarkedBy.findIndex(
      (id) => id.toString() === userId.toString()
    );

    if (index !== -1) {
      message.bookmarkedBy.splice(index, 1);
    } else {
      message.bookmarkedBy.push(userId);
    }

    await message.save();

    //  Emit correct socket event that frontend expects
    req.io.to(message.channel._id.toString()).emit("bookmark_update", {
      messageId: message._id,
      bookmarkedBy: message.bookmarkedBy,
      channelId: message.channel._id
    });

    res.json(message);
  } catch (err) {
    console.error("Bookmark Error:", err);
    res.status(500).json({ message: err.message });
  }
};

/* GET BOOKMARKS */
export const getBookmarks = async (req, res) => {
  try {
    const messages = await Message.find({
      bookmarkedBy: req.user._id,
    })
      .populate("sender", "name email avatar")
      .sort({ createdAt: -1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
