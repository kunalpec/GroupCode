import { runDocker } from "../util/docker.util.js";
import { ApiError } from "../util/ApiError.util.js";
import { asyncHandler } from "../util/asyncHandler.util.js";
import { ApiResponse } from "../util/ApiResponse.util.js";

// 🔹 Create Container
const createUserContainer = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) throw new ApiError(404, "User not found");
  const userId = `user_${user._id}`;
  const volumeName = `vol_${userId}`;
  try {
    const containerId = await runDocker([
      "run",
      "-dit",
      "--name",
      userId,
      "--memory=512m",
      "--cpus=0.5",
      "--pids-limit=100",
      "--security-opt=no-new-privileges",
      "--network=none",
      "-v",
      `${volumeName}:/home/user`,
      "user_sandbox_image"
    ]);
    user.containerId = containerId;
    await user.save({ validateBeforeSave: false });
    return res.status(200).json(
      new ApiResponse(
        200,
        "Container created successfully",
        {
          containerId,
          name: userId,
          volume: volumeName
        }
      )
    );
  } catch (error) {
    if (error.message.includes("already in use")) throw new ApiError(409, "Container already exists");
    throw new ApiError(500, error.message || "Docker failed");
  }
});

// 🔹 Start Container
const startUserContainer = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) throw new ApiError(404, "User not found");
  const userId = `user_${user._id}`;
  try {
    const containerId = await runDocker(["start", userId]);
    return res.status(200).json(
      new ApiResponse(
        200,
        "Container started successfully",
        { containerId }
      )
    );
  } catch (error) {
    if (error.message.includes("No such container")) throw new ApiError(404, "Container not found");
    throw new ApiError(500, error.message || "Failed to start container");
  }
});

// 🔹 Stop Container
const stopUserContainer = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) throw new ApiError(404, "User not found");
  const userId = `user_${user._id}`;
  try {
    const containerId = await runDocker(["stop", userId]);
    return res.status(200).json(
      new ApiResponse(
        200,
        "Container stopped successfully",
        { containerId }
      )
    );
  } catch (error) {
    throw new ApiError(500, error.message || "Failed to stop container");
  }
});

// 🔹 Get Container Status (optimized)
const getContainerStatus = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) throw new ApiError(404, "User not found");
  const userId = `user_${user._id}`;
  try {
    const status = await runDocker([
      "inspect",
      "-f",
      "{{.State.Status}}",
      userId
    ]);
    return res.status(200).json(
      new ApiResponse(
        200,
        "Container status fetched",
        { status }
      )
    );
  } catch (error) {
    throw new ApiError(500, error.message || "Failed to fetch status");
  }
});

export const containerController = {
  createUserContainer,
  startUserContainer,
  stopUserContainer,
  getContainerStatus
};
