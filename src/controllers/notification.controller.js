import Notification from "../models/Notification.js";

export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      user: req.user._id,
    })
        .populate({
        path: "conversation",
        populate: {
          path: "members",
          select: "_id name avatar",
        },
      })

      .sort({ createdAt: -1 })
      .limit(100)
;

    res.json({
      notifications,
      unreadCount: notifications.filter(n => !n.read).length,
    });

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

    req.io.to(req.user._id.toString()).emit("notifications_read", {
      conversationId,
      userId: req.user._id,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export const getUnreadNotificationCount = async (req, res) => {
  const count = await Notification.countDocuments({
    user: req.user._id,
    read: false,
  });

  res.json({ count });
};

