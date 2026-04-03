import jwt from "jsonwebtoken";
import { User } from "../model/user.model.js";

const getCookieValue = (cookieHeader, key) => {
  if (!cookieHeader) return "";

  return (
    cookieHeader
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${key}=`))
      ?.split("=")
      ?.slice(1)
      ?.join("=") || ""
  );
};

const socketAuthMiddleware = async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(" ")[1] ||
      getCookieValue(socket.handshake.headers?.cookie, "accessToken");

    if (!token) {
      return next(new Error("Unauthorized: No token provided"));
    }

    // Fixed: Ensure this secret matches your .env and matches the key in model
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // Fixed: decoded._id (matching generateAccessToken)
    const user = await User.findById(decoded._id).select("_id name avatar oauthImage userColor");

    if (!user) {
      return next(new Error("Unauthorized: User not found"));
    }

    const generateRandomHex = () => {
      return "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
    };

    // Only assign and save color if it doesn't exist
    if (!user.userColor) {
      user.userColor = generateRandomHex();
      await user.save({ validateBeforeSave: false });
    }

    // Attach to socket
    socket.userId = user._id.toString();
    socket.userName = user.name;
    socket.userAvatar = user.avatar?.url || user.oauthImage || "";
    socket.userColor = user.userColor;

    next();
  } catch (err) {
    console.error("Socket Auth Error:", err.message);
    next(new Error("Unauthorized: Invalid token"));
  }
};

export { socketAuthMiddleware };
