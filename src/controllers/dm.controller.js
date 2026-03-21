import DirectMessage from "../models/DirectMessage.js";

/* SEND DM */
export const sendDM = async (req, res) => {
  try {
    const { receiverId, content } = req.body;

    const dm = await DirectMessage.create({
      members: [req.user._id, receiverId],
      sender: req.user._id,
      content,
    });

    const populated = await dm.populate("sender", "name avatar");

    // 🔥 SOCKET
    req.io.to(receiverId).emit("receive_dm", populated);
    req.io.to(req.user._id.toString()).emit("receive_dm", populated);

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* GET DM MESSAGES */
export const getDMs = async (req, res) => {
  try {
    const { userId } = req.params;

    const messages = await DirectMessage.find({
      members: { $all: [req.user._id, userId] },
    })
      .populate("sender", "name avatar")
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
