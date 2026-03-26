import { asyncHandler } from "../util/asyncHandler.util.js";
import { ApiError } from "../util/ApiError.util.js";
import jwt from "jsonwebtoken";
import { User } from "../model/user.model.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    // Extract token from cookies or Authorization header
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Unauthorized request: No token provided");
    }

    // Verify the token using the secret key
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // Find the user in the database based on the token's payload
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new ApiError(401, "Invalid Access Token: User not found");
    }

    req.user = user; // Attach the user object to the request
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});
