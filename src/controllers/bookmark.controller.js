import Bookmark from "../models/Bookmark.js";

/* ---------------- ADD BOOKMARK (PREVENT DUPLICATE) ---------------- */
export const bookmarkMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    // 🔍 check if already bookmarked
    const existing = await Bookmark.findOne({
      user: req.user._id,
      message: messageId,
    });

    if (existing) {
      return res.status(400).json({
        message: "Message already bookmarked",
      });
    }

    const bookmark = await Bookmark.create({
      user: req.user._id,
      message: messageId,
    });

    res.status(201).json(bookmark);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ---------------- GET BOOKMARKS ---------------- */
export const getBookmarks = async (req, res) => {
  try {
    const bookmarks = await Bookmark.find({
      user: req.user._id,
    })
      .populate({
        path: "message",
        populate: {
          path: "sender",
          select: "name email",
        },
      })
      .sort({ createdAt: -1 });

    res.json(bookmarks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ---------------- REMOVE BOOKMARK ---------------- */
export const removeBookmark = async (req, res) => {
  try {
    const { messageId } = req.params;

    const deleted = await Bookmark.findOneAndDelete({
      user: req.user._id,
      message: messageId,
    });

    if (!deleted) {
      return res.status(404).json({
        message: "Bookmark not found",
      });
    }

    res.json({ message: "Bookmark removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
