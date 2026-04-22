import User from "../models/User.js";
import onlineUsers from "../sockets/presence.js";
import { uploadToCloudinary } from "../utils/cloudinaryUpload.js";
import mongoose from "mongoose";

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("_id username name avatar");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const updates = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true }
    )
    .populate("blockedUsers", "username name avatar")
    .select("-password");

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
};


export const updateStatus = async (req, res) => {
  try {
    const { status, customStatus } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        status,
        customStatus,
        lastSeen: new Date(),
      },
      { new: true }
    );

   
    req.io.emit("presence_update", {
      userId: user._id,
      status: user.status,
      customStatus: user.customStatus,
    });

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Status update failed" });
  }
};


export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findById(id)
      .select("-password")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isOnline = onlineUsers.has(id);

    res.json({
      ...user,
      status: isOnline ? "online" : user.status || "offline",
      lastSeen: user.lastSeen,
    });



  } catch (err) {
    console.error("❌ getUserById error:", err);
    res.status(500).json({ message: "Server error" });
  }
};



export const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    const users = await User.find({
      name: { $regex: q, $options: "i" },
    }).select("_id name username avatar");

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Search failed" });
  }
};

/* ================= UPLOAD AVATAR ================= */
export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    //  upload using file path (not buffer)
    const imageUrl = await uploadToCloudinary(req.file.path);

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        avatar: imageUrl,
        avatarType: "upload",
      },
      { new: true }
    ).select("-password");

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Upload failed" });
  }
};



export const selectAvatar = async (req, res) => {
  try {
    const { avatarUrl } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        avatar: avatarUrl,
        avatarType: "preset",
      },
      { new: true }
    );

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Failed to select avatar" });
  }
};


export const completeOnboarding = async (req, res) => {
  try {
    const { username, bio, status, customStatus } = req.body;

    const updates = {
      username,
      bio,
      status,
      customStatus,
      isOnboarded: true,
    };

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true }
    ).select("-password");

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Onboarding failed" });
  }
};


export const blockUser = async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { blockedUsers: userId } },
      { new: true }
    )
      .populate("blockedUsers", "_id name username avatar")
      .select("-password");

    req.io.to(req.user._id.toString()).emit("user_blocked", {
      blockedUserId: userId,
      blockedUsers: user.blockedUsers,
    });

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Block failed" });
  }
};



export const unblockUser = async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { blockedUsers: userId } },
      { new: true }
    )
      .populate("blockedUsers", "_id name username avatar")
      .select("-password");

    // ✅ EMIT REAL-TIME EVENT
    req.io.to(req.user._id.toString()).emit("user_unblocked", {
      unblockedUserId: userId,
      blockedUsers: user.blockedUsers,
    });

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Unblock failed" });
  }
};



export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("blockedUsers", "_id name username avatar")
      .select("-password");

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};
