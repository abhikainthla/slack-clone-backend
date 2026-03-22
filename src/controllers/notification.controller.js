import Notification from "../models/Notification.js";

export const getNotifications = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const notifications = await Notification.find({
      user: req.user._id,
      read: false,
    })
      .populate({
        path: "message",
        populate: {
          path: "workspace", 
        },
      });

    res.json(notifications);
  } catch (error) {
    console.error("GET NOTIFICATIONS ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};


export const markWorkspaceNotificationsRead = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    await Notification.updateMany(
      {
        user: req.user._id,
        read: false,
      },
      { read: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("MARK READ ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

