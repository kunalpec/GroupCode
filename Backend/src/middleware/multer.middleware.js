import multer from "multer";
import path from "path";
import {ApiError} from "../util/ApiError.util.js";

// We are using diskStorage to save files temporarily on the server
// before uploading them to a cloud service like Cloudinary.
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [".png", ".jpg", ".jpeg"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(ext)) {
    cb(null, true); // ✅ accept file
  } else {
    cb(new ApiError(401,"Only PNG and JPG files are allowed"), false); // ❌ reject
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 5, // 5MB
  },
  fileFilter, // 🔥 add this
});