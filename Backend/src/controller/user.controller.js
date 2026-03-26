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

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, "All fields are required");
  const user = await User.findOne({ email });
  if (user.isVerified === false) throw new ApiError(401, "User not verified");
  if (!user) throw new ApiError(404, "User not found");
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
  if (userExists) throw new ApiError(400, "User already exists");
  const user = await User.create({
    name,
    email,
    password,
  });
  res.json(
    new ApiResponse(201, "User created successfully", {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      isVerified: user.isVerified,
    }),
  );
});

const sendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, "Email is required");
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.otp = otp;
  user.otpExpiry = Date.now() + 10 * 60 * 1000;
  await user.save({ validateBeforeSave: false });
  const html=`
    <h2>Your OTP Code</h2>
    <p>Your OTP is: <b>${otp}</b></p>
    <p>This OTP will expire in 10 minutes.</p>
  `
  const info=await mailSender(email, "Your OTP Code", html);
  if (!info) throw new ApiError(500, "Email not sent");
  res.json(new ApiResponse(200, "OTP sent to email"));
});

const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) throw new ApiError(400, "All fields are required");
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");

  if(user.otp !== otp) throw new ApiError(400, "Invalid OTP");
  if(user.otpExpiry < Date.now()) throw new ApiError(400, "OTP expired");
  user.isVerified = true;
  user.otp = null;
  user.otpExpiry = null;
  await user.save({ validateBeforeSave: false });
  res.json(new ApiResponse(200, "OTP verified successfully"));
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
    })
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

  // 📤 send email
  const info=await mailSender(email, "Reset Your Password", html);
  if (!info) throw new ApiError(500, "Email not sent");
  res.json(new ApiResponse(200, "Reset link sent to email"));
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;
  if (!token || !newPassword) throw new ApiError(400, "Token and password required");
  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

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


export const userController={
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

