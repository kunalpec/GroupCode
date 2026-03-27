import crypto from "crypto";
import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      // Password is not required for OAuth users
    },
    avatar: {
      url: {
        type: String,
        default: "",
      },
      public_id: {
        type: String,
        default: "",
      },
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Ensures uniqueness for non-null values
    },
    githubId: {
      type: String,
      unique: true,
      sparse: true, // Ensures uniqueness for non-null values
    },
    oauthImage: {
      type: String,
      default: "",
    },
    refreshToken: {
      type: String,
    },
    isVerified: {
      type: Boolean,
      default: false, // New users should not be verified by default
    },
    passwordResetToken: {
      type: String,
    },
    passwordResetExpiry: {
      type: Date,
    },
    otp: {
      type: String,
    },
    otpExpiry: {
      type: Date,
    },
    containerId: {
      type: String,
      default:"",
    },
    userColor: {
      type: String,
    },
  },
  {
    // This option adds `createdAt` and `updatedAt` fields
    timestamps: true,
  },
);

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 10);
});

// Method to check if the provided password is correct
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Method to generate an access token
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      name: this.name,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    },
  );
};

// Method to generate a refresh token
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    },
  );
};

userSchema.methods.generatePasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  // 🔐 store hashed token in DB
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // ⏳ expiry (10 min)
  this.passwordResetExpiry = Date.now() + 10 * 60 * 1000;

  return resetToken; // send THIS to user
};
export const User = mongoose.model("User", userSchema);
