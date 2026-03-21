import Message from "../models/Message.js";
import Bookmark from "../models/Bookmark.js";
import BookmarkCollection from "../models/BookmarkCollection.js";
/* TOGGLE BOOKMARK */

export const toggleBookmark = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // ✅ SAFETY FIX
    if (!message.bookmarkedBy) {
      message.bookmarkedBy = [];
    }

    const index = message.bookmarkedBy.findIndex(
      (id) => id.toString() === userId.toString()
    );

    if (index !== -1) {
      message.bookmarkedBy.splice(index, 1);
    } else {
      message.bookmarkedBy.push(userId);
    }

    await message.save();

    // ✅ emit
    if (req.io && message.channel) {
      req.io.to(message.channel.toString()).emit("bookmark_update", {
        messageId: message._id,
        bookmarkedBy: message.bookmarkedBy,
        channelId: message.channel,
      });
    }

    res.json(message);
  } catch (err) {
    console.error("Bookmark Error:", err);
    res.status(500).json({ message: err.message });
  }
};



/* GET BOOKMARKS */
export const getBookmarks = async (req, res) => {
  try {
    const { channelId } = req.query;

    const messages = await Message.find({
      bookmarkedBy: req.user._id,
      ...(channelId && { channel: channelId }),
    })
      .populate("sender", "name avatar")
      .sort({ createdAt: -1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


/* UPDATED BOOKMARKS */
export const updateBookmarkSection = async (req, res) => {
  try {
    const { id } = req.params;
    const { section } = req.body;

    const updated = await Bookmark.findByIdAndUpdate(
      id,
      { section },
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


/* BOOKMARKS COLLECTIONS */
export const createCollection = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name required" });
    }

    const collection = await BookmarkCollection.create({
      name,
      user: req.user._id,
    });

    res.json(collection);
  } catch (err) {
    console.error("Create collection error:", err);
    res.status(500).json({ message: err.message });
  }
};


export const getCollections = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const collections = await BookmarkCollection.find({
      user: req.user._id,
    }).populate("bookmarks");

    res.json(collections);
  } catch (err) {
    console.error("Get collections error:", err);
    res.status(500).json({ message: err.message });
  }
};


export const addToCollection = async (req, res) => {
  try {
    const { messageId } = req.body;

    const collection = await BookmarkCollection.findById(req.params.id);

    if (!collection) {
      return res.status(404).json({ message: "Collection not found" });
    }

    if (!collection.bookmarks.includes(messageId)) {
      collection.bookmarks.push(messageId);
      await collection.save();
    }

    res.json(collection);
  } catch (err) {
    console.error("Add to collection error:", err);
    res.status(500).json({ message: err.message });
  }
};
