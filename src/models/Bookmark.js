import mongoose from "mongoose";

const bookmarkSchema = new mongoose.Schema({

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  message: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Message"
  }

}, { timestamps: true });

export default mongoose.model("Bookmark", bookmarkSchema);
