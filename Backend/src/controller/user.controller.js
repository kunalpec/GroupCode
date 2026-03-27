import jwt from "jsonwebtoken";
import crypto from "crypto";

import { User } from "../model/user.model.js";
import { ApiError } from "../util/ApiError.util.js";
import { ApiResponse } from "../util/ApiResponse.util.js";
import { asyncHandler } from "../util/asyncHandler.util.js";
import { uploadOnCloudinary, deletefile } from "../util/cloudinary.util.js";
import { mailSender } from "../util/mailSender.util.js";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
};

const generateTokens = async (user) => {
  if (!user) throw new ApiError(404, "User not found");
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

// 🛠️ Internal Helper (No Res.json here)
const generateAndSendOTP = async (email) => {
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  user.otp = otp;
  user.otpExpiry = Date.now() + 10 * 60 * 1000; // 10 mins
  await user.save({ validateBeforeSave: false });

  const html = `<h2>Your OTP Code</h2><p>Your OTP is: <b>${otp}</b></p>`;

  const info = await mailSender(email, "Your OTP Code", html);
  if (!info) throw new ApiError(500, "Email not sent");

  return true;
};

// Send Message to Email
const SendMessage = async (email, subject, message) => {
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");

  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #007bff;">Notification from Our App</h2>
      <p>Hello ${user.name || "User"},</p>
      <div style="margin: 20px 0; line-height: 1.6;">
        ${message}
      </div>
      <hr />
      <p style="font-size: 12px; color: #777;">If you didn't expect this email, please ignore it.</p>
    </div>
  `;

  const info = await mailSender(email, subject, html);
  if (!info) {
    throw new ApiError(500, "Failed to send the email message");
  }

  return true;
};

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, "All fields are required");

  const user = await User.findOne({ email });
  // FIX: Check if user exists BEFORE checking verification status
  if (!user) throw new ApiError(404, "User not found");
  
  if (user.isVerified === false) throw new ApiError(401, "User not verified. Please verify your email first.");

  const isMatch = await user.isPasswordCorrect(password);
  if (!isMatch) throw new ApiError(400, "Invalid credentials");

  const { accessToken, refreshToken } = await generateTokens(user);
  
  res.cookie("refreshToken", refreshToken, cookieOptions);
  res.cookie("accessToken", accessToken, cookieOptions);

  res.json(
    new ApiResponse(200, "Login successful", {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      isVerified: user.isVerified,
      oauthImage: user.oauthImage,
    }),
  );
});

const signup = asyncHandler(async (req, res) => {
  const { name, email, password, comparePassword } = req.body;
  if (!name || !email || !password || !comparePassword)
    throw new ApiError(400, "All fields are required");
  if (password !== comparePassword)
    throw new ApiError(400, "Passwords do not match");

  const userExists = await User.findOne({ email });
  
  if (userExists) {
    if (userExists.isVerified === true) {
      throw new ApiError(400, "User already exists and is verified");
    } else {
      // FIX: Added response message here so the request doesn't hang
      await generateAndSendOTP(email);
      return res.json(new ApiResponse(200, "User already exists but not verified. A new OTP has been sent to your email."));
    }
  }

  const user = await User.create({
    name,
    email,
    password,
  });

  await generateAndSendOTP(email);

  res.status(201).json(
    new ApiResponse(201, "User created successfully. Verify OTP sent to Email", {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      isVerified: user.isVerified,
      oauthImage: user.oauthImage,
    }),
  );
});

const sendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, "Email is required");
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");

  await generateAndSendOTP(email);
  res.json(new ApiResponse(200, "OTP sent to email"));
});

const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) throw new ApiError(400, "All fields are required");

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");

  if (user.otp !== otp) throw new ApiError(400, "Invalid OTP");
  if (user.otpExpiry < Date.now()) throw new ApiError(400, "OTP expired");

  user.isVerified = true;
  user.otp = null;
  user.otpExpiry = null;
  await user.save({ validateBeforeSave: false });

  // 💡 Strategy: Automatically log user in after verification
  const { accessToken, refreshToken } = await generateTokens(user);
  res.cookie("refreshToken", refreshToken, cookieOptions);
  res.cookie("accessToken", accessToken, cookieOptions);

  res.json(new ApiResponse(200, "OTP verified successfully and logged in", {
    _id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    isVerified: user.isVerified,
    oauthImage: user.oauthImage,
  }));
});

const logout = asyncHandler(async (req, res) => {
  const user_id = req.user._id;
  const user = await User.findById(user_id);
  if (!user) throw new ApiError(404, "User not found");

  user.refreshToken = null;
  await user.save({ validateBeforeSave: false });

  res.clearCookie("refreshToken", cookieOptions);
  res.clearCookie("accessToken", cookieOptions);
  res.json(new ApiResponse(200, "Logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const oldRefreshToken = req.cookies.refreshToken;
  if (!oldRefreshToken)
    throw new ApiError(401, "Unauthorized - No refresh token");

  let decoded;
  try {
    decoded = jwt.verify(oldRefreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch (err) {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const user = await User.findById(decoded._id);
  if (!user) throw new ApiError(401, "User not found");

  if (user.refreshToken !== oldRefreshToken)
    throw new ApiError(401, "Refresh token mismatch");

  const { accessToken, refreshToken } = await generateTokens(user);
  res.cookie("accessToken", accessToken, cookieOptions);
  res.cookie("refreshToken", refreshToken, cookieOptions);

  return res.json(
    new ApiResponse(200, "Access token refreshed successfully", {
      accessToken,
    }),
  );
});

const uploadAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found");

  if (!req.file?.path) throw new ApiError(400, "No file uploaded");
  if (user.avatar?.public_id) await deletefile(user.avatar.public_id);

  const uploadedFile = await uploadOnCloudinary(req.file.path);
  if (!uploadedFile) throw new ApiError(500, "Avatar upload failed");

  user.avatar = {
    url: uploadedFile.secure_url,
    public_id: uploadedFile.public_id,
  };

  await user.save({ validateBeforeSave: false });

  res.json(
    new ApiResponse(200, "Avatar updated successfully", {
      avatar: user.avatar.url,
    }),
  );
});

const forgetPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, "Email is required");

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");

  const resetToken = user.generatePasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  const html = `
    <h2>Password Reset</h2>
    <p>Click below to reset your password:</p>
    <a href="${resetUrl}">${resetUrl}</a>
    <p>This link will expire in 10 minutes.</p>
  `;

  const info = await mailSender(email, "Reset Your Password", html);
  if (!info) throw new ApiError(500, "Email not sent");
  res.json(new ApiResponse(200, "Reset link sent to email"));
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;
  if (!token || !newPassword)
    throw new ApiError(400, "Token and password required");

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) throw new ApiError(400, "Invalid or expired token");

  user.password = newPassword;
  user.refreshToken = null;
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  await user.save();

  res.json(new ApiResponse(200, "Password reset successful"));
});

export const userController = {
  login,
  signup,
  sendOTP,
  verifyOTP,
  logout,
  refreshAccessToken,
  uploadAvatar,
  forgetPassword,
  resetPassword,
};