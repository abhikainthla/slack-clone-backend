import express from "express";
import mongoose from "mongoose";


const router = express.Router();


router.get("/deep", async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState; // 1 = connected

    res.json({
      status: "ok",
      db: dbState === 1 ? "connected" : "disconnected",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
});

export default router;