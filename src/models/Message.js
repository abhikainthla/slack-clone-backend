import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
      required: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    parentMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        default: null
        },

  edited: {
    type: Boolean,
    default: false
  },

  editHistory: [
    {
      content: String,
      editedAt: Date
    }
  ],

  readBy: [
    {
        user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
        },
        readAt: {
        type: Date,
        default: Date.now
        }
    }
    ],


    content: {
      type: String,
      required: true,
      trim: true,
    },
    pinned: {
        type: Boolean,
        default: false
        },

    attachments: [
      {
        type: String,
      },
    ],

    reactions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        emoji: String,
      },
    ],
  },
  { timestamps: true }
);

messageSchema.index({ content: "text" });

export default mongoose.model("Message", messageSchema);
