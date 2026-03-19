import multer from "multer";
import path from "path";
import fs from "fs";

// ✅ Ensure uploads folder exists
const uploadsDir = "uploads";
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "_" + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  // ✅ Allow common file types
  const allowedTypes = /jpeg|jpg|png|gif|pdf|mp4|mp3/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error("Only images, PDFs, videos, and audio allowed"));
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

export default upload;
