import ChannelMember from "../models/ChannelMember.js";

export const requireRole = (roles) => {
  return async (req, res, next) => {

    const { channelId } = req.params;

    const member = await ChannelMember.findOne({
      channel: channelId,
      user: req.user._id
    });

    if (!member || !roles.includes(member.role)) {
      return res.status(403).json({
        message: "Permission denied"
      });
    }

    next();
  };
};
