import Channel from "../models/Channel.js";
import Workspace from "../models/Workspace.js";

/* CREATE CHANNEL */
export const createChannel = async (req, res) => {
  try {

    const { name, workspaceId, isPrivate } = req.body;

    if (!name || !workspaceId) {
      return res.status(400).json({
        message: "Channel name and workspaceId required",
      });
    }

    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      return res.status(404).json({
        message: "Workspace not found",
      });
    }

    const channel = await Channel.create({
      name,
      workspace: workspaceId,
      createdBy: req.user._id,
      members: [req.user._id],
      isPrivate: isPrivate || false,
    });

    res.status(201).json(channel);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


/* GET CHANNELS BY WORKSPACE */
export const getWorkspaceChannels = async (req, res) => {
  try {

    const { workspaceId } = req.params;

    const channels = await Channel.find({
      workspace: workspaceId,
    }).populate("createdBy", "name email");

    res.json(channels);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


/* JOIN CHANNEL */
export const joinChannel = async (req, res) => {
  try {

    const { channelId } = req.params;

    const channel = await Channel.findById(channelId);

    if (!channel) {
      return res.status(404).json({
        message: "Channel not found",
      });
    }

    if (!channel.members.includes(req.user._id)) {
      channel.members.push(req.user._id);
      await channel.save();
    }

    res.json(channel);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


/* LEAVE CHANNEL */
export const leaveChannel = async (req, res) => {
  try {

    const { channelId } = req.params;

    const channel = await Channel.findById(channelId);

    if (!channel) {
      return res.status(404).json({
        message: "Channel not found",
      });
    }

    channel.members = channel.members.filter(
      (member) => member.toString() !== req.user._id.toString()
    );

    await channel.save();

    res.json({ message: "Left channel" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
