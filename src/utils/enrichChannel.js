export const enrichChannel = (channel, userId) => {
  const admins = (channel.roles?.admins || []).map((id) =>
    id.toString()
  );
  const moderators = (channel.roles?.moderators || []).map((id) =>
    id.toString()
  );

  const currentUserId = userId?.toString();

  /* ---------------- ROLE ---------------- */
  let role = "member";

  if (admins.includes(currentUserId)) {
    role = "admin";
  } else if (moderators.includes(currentUserId)) {
    role = "moderator";
  }

  /* ---------------- HAS UNREAD ---------------- */
  const lastMessage = channel.lastMessage;

  const hasUnread =
    lastMessage &&
    !lastMessage.readBy?.some((r) => {
      const id =
        typeof r.user === "object" ? r.user._id : r.user;
      return id?.toString() === currentUserId;
    });

  return {
    ...channel,
    roles: {
      admins,
      moderators,
    },
    role,
    hasUnread,
  };
};
