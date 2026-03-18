import mongoose from "mongoose";

const workspaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    description: {
      type: String,
      default: "",
    },

    color: {
      type: String,
      default: "bg-purple-500",
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },


members: [
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    role: {
      type: String,
      enum: ["admin", "moderator", "member"],
      default: "member",
    },
  },
],

  },
  { timestamps: true }
);

export default mongoose.model("Workspace", workspaceSchema);
