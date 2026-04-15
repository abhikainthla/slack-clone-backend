import User from "../models/User.js";
import { uploadToCloudinary } from "../utils/cloudinaryUpload.js";


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
    ).select("-password");

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

    // 🔥 emit realtime update
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
    const user = await User.findById(req.params.id)
      .select("-password");

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "User not found" });
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


