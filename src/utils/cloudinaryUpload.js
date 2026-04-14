import cloudinary from "../config/cloudinary.js";
import fs from "fs";

export const uploadToCloudinary = async (filePath) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: "avatars",
    });


    fs.unlinkSync(filePath);

    return result.secure_url;
  } catch (err) {
    console.error(err);
    throw err;
  }
};
