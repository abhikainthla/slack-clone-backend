import User from "../models/User.js";


export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("_id username name");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
};