import mongoose from "mongoose";

const invitationSchema = new mongoose.Schema({

  email: String,

  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Workspace"
  },

  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  token: String,

  accepted: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });

export default mongoose.model("Invitation", invitationSchema);
