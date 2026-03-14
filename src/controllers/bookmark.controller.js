import Bookmark from "../models/Bookmark.js";

export const bookmarkMessage = async (req, res) => {

  const { messageId } = req.params;

  const bookmark = await Bookmark.create({
    user: req.user._id,
    message: messageId
  });

  res.status(201).json(bookmark);

};

export const getBookmarks = async (req, res) => {

  const bookmarks = await Bookmark.find({
    user: req.user._id
  }).populate("message");

  res.json(bookmarks);

};