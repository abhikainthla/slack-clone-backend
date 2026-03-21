import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    content: {
      type: String,
    },

    //  For channel messages
    channel: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Channel",
  default: null,
},

conversation: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Conversation",
  default: null,
},

    parentMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    reactions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: String,
      },
    ],

    pinned: { type: Boolean, default: false },

    bookmarkedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

/*  VALIDATION */
messageSchema.pre("validate", function (next) {
  if (!this.channel && !this.conversation) {
    return next(new Error("Message must have channel or conversation"));
  }
  next();
});

export default mongoose.model("Message", messageSchema);
