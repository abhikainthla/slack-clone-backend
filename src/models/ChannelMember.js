import mongoose from "mongoose";

const channelMemberSchema = new mongoose.Schema({
  

  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Channel"
  },

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  role: {
    type: String,
    enum: ["admin", "moderator", "member"],
    default: "member"
  },

  lastReadMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Message",
    default: null
  }

}, { timestamps: true });

export default mongoose.model("ChannelMember", channelMemberSchema);
