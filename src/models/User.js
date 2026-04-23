import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    username: {
      type: String,
      unique: true,
      sparse: true, 
      lowercase: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    avatar: {
      type: String,
      default: "",
    },

    avatarType: {
      type: String,
      enum: ["upload", "preset"],
      default: "upload",
    },


    bio: {
      type: String,
      default: "",
      maxlength: 160,
    },

    status: {
      type: String,
      enum: ["online", "offline", "away", "dnd"],
      default: "offline",
    },

    customStatus: {
      text: String,
      emoji: String,
    },

    lastSeen: {
      type: Date,
      default: Date.now,
    },

    isOnboarded: {
      type: Boolean,
      default: false,
    },


    // Slack-like preferences
    preferences: {
      theme: { type: String, default: "light" },
      notifications: { type: Boolean, default: true },
      sound: { type: Boolean, default: true },
    },

    // relationships (future use)
    blockedUsers: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" }
    ],

    friends: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" }
    ],
      resetPasswordToken: String,
      resetPasswordExpire: Date,

      isEmailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationToken: String,
    emailVerificationExpire: Date,
  },


  { timestamps: true }
);

export default mongoose.model("User", userSchema);
