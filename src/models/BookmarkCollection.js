import mongoose from "mongoose";

const collectionSchema = new mongoose.Schema({
  name: String,

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Channel",
  },

  bookmarks: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
  ],
}, { timestamps: true });

export default mongoose.model("BookmarkCollection", collectionSchema);
