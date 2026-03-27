import {userController} from "../controller/user.controller.js";
import {verifyJWT} from "../middleware/auth.middleware.js";
import {upload} from "../middleware/multer.middleware.js";
import express,{ Router } from "express";
import { rateLimit } from 'express-rate-limit';

const route = Router();
// 🚫 Strict Limiter for sensitive routes
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Only 5 attempts per hour!
  message: {
    status: 429,
    message: "Too many attempts. For security, please try again in an hour."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

route.post("/login", userController.login);
route.post("/signup", authLimiter,userController.signup);
route.post("/send-otp", userController.sendOTP);
route.post("/verify-otp", userController.verifyOTP);

route.post("/logout", verifyJWT, userController.logout);
route.get("/refresh-token", userController.refreshAccessToken);

route.post("/upload-avatar", verifyJWT, upload.single("avatar"), userController.uploadAvatar);

route.post("/forget-password", userController.forgetPassword);
route.post("/reset-password/:token", userController.resetPassword);

export default route;