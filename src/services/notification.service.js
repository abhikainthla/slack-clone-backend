
import Notification from "../models/Notification.js";
import ChannelMember from "../models/ChannelMember.js";
import Conversation from "../models/Conversation.js";

/**
 * Create notifications for a message
 */
export const createMessageNotifications = async ({
  message,
  senderId,
  channelId,
  conversationId,
  mentions = [],
  receiverId,
  io,
}) => {
  const notificationMap = new Map();

  /* ================= CHANNEL ================= */
  if (channelId) {
    const members = await ChannelMember.find({
      channel: channelId,
      user: { $ne: senderId },
    });

    members.forEach((m) => {
      notificationMap.set(m.user.toString(), {
        user: m.user,
        type: "channel",
        channel: channelId,
      });
    });
  }

  /* ================= MENTIONS (override) ================= */
  mentions.forEach((id) => {
    if (id.toString() === senderId.toString()) return;

    const existing = notificationMap.get(id.toString());

    notificationMap.set(id.toString(), {
    user: id,
    type: existing?.type === "channel" ? "mention" : "mention",
    channel: channelId || null,
    conversation: conversationId || null,
    });
  });

  /* ================= DM ================= */
  if (receiverId && receiverId.toString() !== senderId.toString()) {
    notificationMap.set(receiverId.toString(), {
      user: receiverId,
      type: "dm",
      conversation: conversationId,
    });
  }

  const notifications = Array.from(notificationMap.values()).map((n) => ({
    ...n,
    message: message._id,
  }));

  if (!notifications.length) return [];

 let created = [];

try {
  created = await Notification.insertMany(notifications, { ordered: false });
} catch (err) {
  console.error("Notification insert error:", err);
}

// ✅ SAFETY: if nothing inserted, avoid crash
if (!created.length) return [];

/* ================= SOCKET EMIT ================= */
const plain = created.map(n => n.toObject());

const grouped = {};

plain.forEach((n) => {
  const userId = n.user.toString();
  if (!grouped[userId]) grouped[userId] = [];
  grouped[userId].push(n);
});

Object.entries(grouped).forEach(([userId, notifs]) => {
  io.to(userId).emit("new_notification", notifs);
});

return created;
};
