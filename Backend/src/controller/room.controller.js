import { runDocker } from "../util/docker.util.js";
import { nanoid } from "nanoid";
import { ApiError } from "../util/ApiError.util.js";
import { asyncHandler } from "../util/asyncHandler.util.js";
import { ApiResponse } from "../util/ApiResponse.util.js";
import { Room } from "../model/room.model.js";
import {roomContainerMap} from "../socket/index.js";


// 🔹 Create a new Room (and its corresponding folder in the user's container)
const createNewRoom = asyncHandler(async (req, res) => {
  // Get the authenticated user object, which was added to the request by our auth middleware
  const user = req.user;
  if (!user) throw new ApiError(404, "User not found");

  // Get the desired name for the room from the request body
  const { roomName } = req.body;
  if (!roomName) throw new ApiError(400, "Room name is required");

  // --- Logic to create a unique folder name like "room_1", "room_2", etc. ---
  // Find the most recently created room by this user to determine the next index
  const lastRoom = await Room.findOne({ owner: user._id }).sort({
    createdAt: -1,
  });

  // Start with index 1 by default
  let roomIndex = 1;
  // If the user has a previous room, parse its name to figure out the next index
  if (lastRoom && lastRoom.dockerRoomName.startsWith("room_")) {
    const lastIndex = parseInt(lastRoom.dockerRoomName.split("_")[1]);
    // If parsing fails for some reason, fall back to 1, otherwise increment
    roomIndex = isNaN(lastIndex) ? 1 : lastIndex + 1;
  }

  // Construct the folder name and a unique token for invitation links
  const dockerFolderName = `room_${roomIndex}`;
  const uniqueId = nanoid(20); // e.g., "aB3xY_8fG..."
  const roomPath = `/home/user/${dockerFolderName}`;
  const containerId = `user_${user._id}`;

  try {
    // Ensure the user's Docker container is running. If it's stopped, this will start it.
    // We use .catch(() => {}) to ignore errors if the container is already running.
    await runDocker(["start", containerId]).catch(() => {});

    // Execute a command inside the container to create the directory for the new room.
    // The "-p" flag ensures parent directories are created if they don't exist.
    await runDocker(["exec", containerId, "mkdir", "-p", roomPath]);

    // Create a new record for the room in our MongoDB database
    const room = await Room.create({
      owner: user._id,
      roomName: roomName.trim(),
      dockerRoomName: dockerFolderName,
      inviteToken: uniqueId,
      users: [user._id], // The owner is the first user in the room
      path: roomPath, // Store the full path inside the container
    });

    // make the map for inviteToken ---> container_ID ok 
    roomContainerMap.set(uniqueId, containerId);
    // Send a successful response back to the client with the new room's details
    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { room, inviteLink: `${process.env.FRONTEND_URL}/join/${uniqueId}` },
          "Room created successfully",
        ),
      );
  } catch (error) {
    // Handle a specific database error for duplicate entries
    if (error.code === 11000) {
      throw new ApiError(
        409,
        "A room with this index already exists. Please try again.",
      );
    }
    // Handle any other errors that might occur
    throw new ApiError(
      500,
      error.message || "Failed to create room infrastructure",
    );
  }
});

// Delete Room
const deleteRoom = asyncHandler(async (req, res) => {
  const { roomId } = req.params; // Get ID from URL: /api/v1/rooms/:roomId
  const user = req.user; // Get the currently logged-in user

  // Make sure a user is actually logged in
  if (!user) throw new ApiError(401, "Unauthorized");

  // --- Security Check ---
  // Find the room in the database, but ONLY if the current user is the owner.
  // This is a critical step to prevent one user from deleting another user's room.
  const room = await Room.findOne({ _id: roomId, owner: user._id });

  // If no room is found (either it doesn't exist or the user isn't the owner), throw an error.
  if (!room) {
    throw new ApiError(
      404,
      "Room not found or you don't have permission to delete it",
    );
  }

  // Get the container ID (which belongs to the owner) and the room's folder path
  const containerId = `user_${user._id}`;
  const roomPath = room.path || `/home/user/${room.dockerRoomName}`;

  try {
    // 1. Ensure the container is running so we can execute commands inside it.
    // If it's already running, 'start' does nothing. If stopped, it wakes it up.
    await runDocker(["start", containerId]).catch(() => {});

    // 2. Delete the folder inside the Docker container.
    // 'rm -rf' is a powerful command that recursively and forcefully deletes the folder and all its contents.
    await runDocker(["exec", containerId, "rm", "-rf", roomPath]);

    // 3. Remove the room's record from our MongoDB database.
    await Room.findByIdAndDelete(roomId);

    // delete the invite_id ->conatiner_id map
    roomContainerMap.delete(room.inviteToken);
    // 4. Send a success response.
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {},
          "Room and container files deleted successfully",
        ),
      );
    
  } catch (error) {
    // If anything goes wrong, log the error and inform the user.
    console.error("DELETION_ERROR:", error);
    throw new ApiError(500, "Failed to clean up room infrastructure");
  }
});

// 🔹 Get the directory structure (file tree) of a specific room
const getRoomDirectory = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const user = req.user;

  // 1. Verify the user has access to this room.
  // We check if the user's ID is in the `users` array of the room document.
  // This allows both the owner and invited members to see the file structure.
  const room = await Room.findOne({ _id: roomId, users: user._id });
  if (!room) throw new ApiError(404, "Room not found");

  // The container always belongs to the room's owner.
  const containerId = `user_${room.owner}`;
  const roomPath = room.path;

  try {
    // 2. Run the 'find' command inside the container to list all files and folders.
    // -maxdepth 3: Prevents the command from going too deep (e.g., into a massive node_modules folder).
    // -not -path '*/.*': Hides hidden files and folders (like .git, .vscode).
    const output = await runDocker([
      "exec",
      containerId,
      "find",
      roomPath,
      "-maxdepth",
      "3",
      "-not",
      "-path",
      "*/.*",
    ]);

    // 3. Process the raw text output from the 'find' command into a clean array.
    const fileList = output
      .split("\n") // Split the string into an array of lines.
      .filter((line) => line.trim() !== "") // Remove any empty lines.
      .map((line) => line.replace(roomPath, "")); // Make paths relative to the room root for the frontend.

    // 4. Send the file list back to the client.
    return res
      .status(200)
      .json(new ApiResponse(200, { files: fileList }, "Directory fetched"));
  } catch (error) {
    // Handle any errors during the directory reading process.
    throw new ApiError(500, "Failed to read directory");
  }
});

const getAllRooms = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) throw new ApiError(404, "User not found");

  const rooms = await Room.find({ users: user._id });

  return res
    .status(200)
    .json(new ApiResponse(200, {
      rooms,
    }, "Rooms fetched successfully"));
});

export const roomController = {
  createNewRoom,
  deleteRoom,
  getRoomDirectory,
  getAllRooms
};
