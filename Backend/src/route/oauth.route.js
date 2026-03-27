import express, { Router } from "express";
import passport from "passport";
import { ApiResponse } from "../util/ApiResponse.util.js";
const router = Router();

// ======= Helper function =======
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
};

const handleOAuthCallback = async (req, res) => {
  try {
    const user = req.user;

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.cookie("accessToken", accessToken, cookieOptions);
    res.cookie("refreshToken", refreshToken, cookieOptions);

    res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
  } catch (err) {
    res.redirect(`${process.env.FRONTEND_URL}/login`);
  }
};

// ================= GOOGLE =================

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  }),
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.FRONTEND_URL}/login`,
    session: false, // 🔥 IMPORTANT
  }),
  handleOAuthCallback
);

// ================= GITHUB =================

router.get(
  "/github",
  passport.authenticate("github", {
    scope: ["user:email"],
  }),
);

router.get(
  "/github/callback",
  passport.authenticate("github", {
    failureRedirect: `${process.env.FRONTEND_URL}/login`,
    session: false, // 🔥 IMPORTANT
  }),
  handleOAuthCallback
);


export default router;