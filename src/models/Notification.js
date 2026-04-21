import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    type: {
      type: String,
      enum: ["channel", "dm", "mention"],
      required: true,
    },

    message: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },

    channel: { type: mongoose.Schema.Types.ObjectId, ref: "Channel" },
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" },

    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ✅ indexes (important)
notificationSchema.index({ user: 1, read: 1 });
notificationSchema.index({ user: 1, channel: 1 });
notificationSchema.index({ user: 1, conversation: 1 });



export default mongoose.model("Notification", notificationSchema);
