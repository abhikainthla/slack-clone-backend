export const getNotifications = async (req, res) => {

  const notifications = await Notification.find({
    user: req.user._id,
    read: false
  })
    .populate("message");

  res.json(notifications);
};

export const markWorkspaceNotificationsRead = async (req, res) => {
  const { workspaceId } = req.params;

  await Notification.updateMany(
    {
      user: req.user._id,
      read: false,
    },
    { read: true }
  );

  res.json({ success: true });
};
