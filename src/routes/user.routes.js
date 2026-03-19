import express from "express";
import { getAllUsers } from "../controllers/user.controller.js";
import protect from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", protect, getAllUsers);   
router.get("/profile", protect, (req, res) => {
  res.json(req.user);
});

export default router;
