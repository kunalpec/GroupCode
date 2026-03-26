import {userController} from "../controller/user.controller.js";
import {verifyJWT} from "../middleware/auth.middleware.js";
import {upload} from "../middleware/multer.middleware.js";
import express,{ Router } from "express";
const route = Router();

route.post("/login", userController.login);
route.post("/signup", userController.signup);
route.post("/send-otp", userController.sendOTP);
route.post("/verify-otp", userController.verifyOTP);

route.post("/logout", verifyJWT, userController.logout);
route.get("/refresh", userController.refreshAccessToken);

route.post("/upload-avatar", verifyJWT, upload.single("avatar"), userController.uploadAvatar);

route.post("/forget-password", userController.forgetPassword);
route.post("/reset-password/:token", userController.resetPassword);

export default route;