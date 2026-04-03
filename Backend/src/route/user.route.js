import {userController} from "../controller/user.controller.js";
import {verifyJWT} from "../middleware/auth.middleware.js";
import {upload} from "../middleware/multer.middleware.js";
import express,{ Router } from "express";
import { rateLimit } from 'express-rate-limit';

const router = Router();
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

router.post("/login", userController.login);
router.post("/signup",userController.signup);
router.post("/send-otp", userController.sendOTP);
router.post("/verify-otp", userController.verifyOTP);

router.post("/logout", verifyJWT, userController.logout);
router.get("/refresh-token", userController.refreshAccessToken);

router.post("/upload-avatar", verifyJWT, upload.single("avatar"), userController.uploadAvatar);

router.post("/forget-password", userController.forgetPassword);
router.post("/reset-password/:token", userController.resetPassword);

// GET /api/user/me
router.get("/me", verifyJWT, userController.getCurrentUser);
export default router;