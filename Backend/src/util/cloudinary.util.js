import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configure Cloudinary with credentials from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    // Upload the file to Cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto", // Automatically detect the file type
    });

    fs.unlinkSync(localFilePath); // Remove the locally saved temporary file
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // Also remove the temp file if upload fails
    console.error("Cloudinary upload failed:", error);
    return null;
  }
};

const deletefile = async (public_id) => {
  try {
    const result = await cloudinary.uploader.destroy(public_id);
    return result;
  } catch (error) {
    console.error(error);
  }
};
export { uploadOnCloudinary, deletefile };
