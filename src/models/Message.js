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


    content: {
      type: String,
      required: true,
      trim: true,
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

export default mongoose.model("Message", messageSchema);
