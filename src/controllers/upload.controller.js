import { uploadToCloudinary } from "../utils/cloudinaryUpload.js";
import fs from "fs";

/* ================= HANDLE UPLOAD ================= */
export const handleUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { fieldname, path } = req.file;

    // 🔥 AVATAR UPLOAD → CLOUDINARY
    if (fieldname === "avatar") {
      const imageUrl = await uploadToCloudinary(path);

      return res.json({
        type: "avatar",
        url: imageUrl,
      });
    }

    // 🔥 MESSAGE FILE → KEEP LOCAL
    if (fieldname === "file") {
      return res.json({
        type: "file",
        url: `/uploads/${req.file.filename}`,
      });
    }

    // fallback
    res.status(400).json({ message: "Invalid upload type" });

  } catch (err) {
    console.error(err);

    // cleanup if error
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ message: "Upload failed" });
  }
};
