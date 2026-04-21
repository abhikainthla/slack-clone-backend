import Notification from "../models/Notification.js";

export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      user: req.user._id,
    })
      .populate({
        path: "message",
        populate: [
          { path: "sender", select: "name avatar" },
          { path: "channel", select: "_id name" },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* MARK CHANNEL NOTIFICATIONS READ */
export const markChannelNotificationsRead = async (req, res) => {
  try {
    const { channelId } = req.params;

    await Notification.updateMany(
      {
        user: req.user._id,
        channel: channelId,
        read: false,
      },
      { read: true }
    );

    req.io.to(req.user._id.toString()).emit("notifications_read", {
      channelId,
      userId: req.user._id,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* MARK DM NOTIFICATIONS READ */
export const markDMNotificationsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;

    await Notification.updateMany(
      {
        user: req.user._id,
        conversation: conversationId,
        read: false,
      },
      { read: true }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};