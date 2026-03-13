import express from "express";
import protect from "../middleware/auth.middleware.js";

const router = express.Router();

/* GET USER PROFILE */
router.get("/profile", protect, (req, res) => {
  res.json(req.user);
});

export default router;
