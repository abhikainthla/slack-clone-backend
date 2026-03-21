import mongoose from "mongoose";

const bookmarkSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      required: true,
    },

    section: {
      type: String,
      default: "all", // design | code | links etc
    },
  },
  { timestamps: true }
);

export default mongoose.model("Bookmark", bookmarkSchema);
