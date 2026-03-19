import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

// ✅ LOAD .env FIRST
dotenv.config();

console.log("🔍 ENV CHECK:");
console.log("CLOUD_NAME:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("API_KEY:", process.env.CLOUDINARY_API_KEY ? "✅ FOUND" : "❌ MISSING");
console.log("API_SECRET:", process.env.CLOUDINARY_API_SECRET ? "✅ FOUND" : "❌ MISSING");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log("✅ Cloudinary config loaded:", cloudinary.config().cloud_name);

export default cloudinary;
