export const getNotifications = async (req, res) => {

  const notifications = await Notification.find({
    user: req.user._id,
    read: false
  })
    .populate("message");

  res.json(notifications);
};
