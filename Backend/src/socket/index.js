import { Room } from "../model/room.model.js";
import { Server } from "socket.io";
import { runDocker } from "../util/docker.util.js";
import { spawn } from "child_process";
import { Message } from "../model/message.model.js";
import { socketAuthMiddleware } from "../middleware/socket.middleware.js";

let io;

// room_inviteToken → Set(userId)
const roomUsers = new Map();

// room_inviteToken → Map(userId, Set(socketId))
const roomUserSockets = new Map();

// room_inviteToken → Map(userId, member)
const roomPresenceMap = new Map();

// userId → socket.id
const userSocketMap = new Map();

// room_inviteToken → containerId
export const roomContainerMap = new Map();

// socket.id → shell process
const roomShellMap = new Map();

async function getRoomAndContainer(socket, inviteTokenOverride = "") {
  const resolvedInviteToken = inviteTokenOverride || socket.room_inviteToken;
  const room = await Room.findOne({ inviteToken: resolvedInviteToken });
  if (!room) {
    throw new Error("Room not found");
  }

  socket.room_inviteToken = resolvedInviteToken;
  socket.room_id = room._id;

  const containerId = `user_${room.owner}`;
  roomContainerMap.set(resolvedInviteToken, containerId);

  await runDocker(["start", containerId]).catch(() => {});

  return { room, containerId };
}

// =========================
// Helper
// =========================
function buildMemberFromSocket(socket) {
  return {
    userId: socket.userId,
    name: socket.userName,
    email: socket.userEmail || "",
    avatar: socket.userAvatar || "",
    userColor: socket.userColor || "#38bdf8",
  };
}

function ensureRoomState(room_inviteToken) {
  if (!roomUsers.has(room_inviteToken)) {
    roomUsers.set(room_inviteToken, new Set());
  }

  if (!roomUserSockets.has(room_inviteToken)) {
    roomUserSockets.set(room_inviteToken, new Map());
  }

  if (!roomPresenceMap.has(room_inviteToken)) {
    roomPresenceMap.set(room_inviteToken, new Map());
  }
}

function getRoomMembers(room_inviteToken) {
  return Array.from(roomPresenceMap.get(room_inviteToken)?.values() || []);
}

function emitRoomPresence(room_inviteToken) {
  if (!room_inviteToken) return;

  io.to(room_inviteToken).emit("room-users", {
    roomId: room_inviteToken,
    users: getRoomMembers(room_inviteToken),
    count: roomPresenceMap.get(room_inviteToken)?.size || 0,
  });
}

function getTerminalSessionKey(socketId, terminalId = "terminal-1") {
  return `${socketId}:${terminalId}`;
}

function closeSocketTerminals(socket) {
  const prefix = `${socket.id}:`;

  for (const [key, shell] of roomShellMap.entries()) {
    if (!key.startsWith(prefix)) continue;
    shell.kill();
    roomShellMap.delete(key);
  }
}

async function addUserToRoom(room, socket) {
  const { userId, room_inviteToken } = socket;

  if (!room.users.includes(userId)) {
    room.users.push(userId);
    await room.save();
  }

  ensureRoomState(room_inviteToken);
  roomUsers.get(room_inviteToken).add(userId);
  const socketMap = roomUserSockets.get(room_inviteToken);
  const userSockets = socketMap.get(userId) || new Set();
  userSockets.add(socket.id);
  socketMap.set(userId, userSockets);
  roomPresenceMap.get(room_inviteToken).set(userId, buildMemberFromSocket(socket));
  userSocketMap.set(userId, socket.id);

  emitRoomPresence(room_inviteToken);
}

function removeUserFromRoom(socket) {
  const { room_inviteToken, userId } = socket;
  if (!room_inviteToken || !userId) return false;

  const socketMap = roomUserSockets.get(room_inviteToken);
  const userSockets = socketMap?.get(userId);
  if (!userSockets) return false;

  userSockets.delete(socket.id);

  if (userSockets.size > 0) {
    return false;
  }

  socketMap.delete(userId);
  roomUsers.get(room_inviteToken)?.delete(userId);
  roomPresenceMap.get(room_inviteToken)?.delete(userId);
  emitRoomPresence(room_inviteToken);
  return true;
}

function isValidFileName(fileName) {
  return !fileName.includes("..");
}

function shellEscape(value) {
  return `"${String(value).replace(/(["\\$`])/g, "\\$1")}"`;
}

function emitWorkspaceUpdate(socket, payload) {
  if (!socket.room_inviteToken) return;

  io.to(socket.room_inviteToken).emit("workspace-updated", {
    ...payload,
    actor: {
      userId: socket.userId,
      name: socket.userName,
      avatar: socket.userAvatar,
    },
    time: new Date().toISOString(),
  });
}

// =========================
// 🚀 START SERVER
// =========================
const startIoServer = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  console.log("Socket.io server started");

  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    console.log("User connected:", socket.userId);

    // =========================
    // 1. JOIN ROOM
    // =========================
    socket.on("join-room", async ({ inviteToken }, callback) => {
      try {
        const room = await Room.findOne({ inviteToken });

        if (!room) {
          return callback({ success: false, message: "Room not found" });
        }

        // ✅ CLEAN NAMING
        socket.room_inviteToken = inviteToken; // socket layer
        socket.room_id = room._id; // DB layer

        // duplicate join
        if (room.users.includes(socket.userId)) {
          socket.join(inviteToken);
          await addUserToRoom(room, socket);
          return callback({
            success: true,
            message: "Already in room",
            roomName: room.roomName,
            path: room.path,
            users: room.users,
            roomUsers: getRoomMembers(inviteToken),
          });
        }

        // OWNER
        if (room.owner.toString() === socket.userId.toString()) {
          socket.join(inviteToken);
          await addUserToRoom(room, socket);

          return callback({
            success: true,
            roomName: room.roomName,
            path: room.path,
            users: room.users,
            roomUsers: getRoomMembers(inviteToken),
            userColor: socket.userColor,
            isOwner: true,
          });
        }

        // USER → request
        const ownerSocketId = userSocketMap.get(room.owner.toString());

        if (ownerSocketId) {
          io.to(ownerSocketId).emit("join-request", {
            roomId: inviteToken,
            userId: socket.userId,
            socketId: socket.id,
            name: socket.userName,
            avatar: socket.userAvatar,
          });

          return callback({
            success: true,
            pending: true,
            message: "Waiting for approval",
          });
        }

        return callback({
          success: false,
          message: "Owner not online",
        });
      } catch (err) {
        console.error("Join Room Error:", err);
        return callback({ success: false, message: "Server error" });
      }
    });

    // =========================
    // 2. HANDLE JOIN REQUEST
    // =========================
    socket.on("handle-join-request", async ({ roomId, socketId, action }) => {
      const room = await Room.findOne({ inviteToken: roomId });
      if (!room) return;

      if (room.owner.toString() !== socket.userId.toString()) return;

      const targetSocket = io.sockets.sockets.get(socketId);
      if (!targetSocket) return;

      if (action === "accept") {
        targetSocket.join(roomId);

        // ✅ CLEAN NAMING
        targetSocket.room_inviteToken = roomId;
        targetSocket.room_id = room._id;

        await addUserToRoom(room, targetSocket);

        io.to(socketId).emit("join-approved", {
          roomId,
          roomName: room.roomName,
          roomUsers: getRoomMembers(roomId),
        });

        targetSocket.to(roomId).emit("user-joined-notification", {
          userId: targetSocket.userId,
          name: targetSocket.userName,
          email: targetSocket.userEmail,
          avatar: targetSocket.userAvatar,
          userColor: targetSocket.userColor,
        });
      } else {
        io.to(socketId).emit("join-rejected");
      }
    });

    // =========================
    // 3. GET FILES
    // =========================
    socket.on("get-files", async (_, callback) => {
      try {
        const { room, containerId } = await getRoomAndContainer(socket);
        const output = await runDocker([
          "exec",
          containerId,
          "bash",
          "-lc",
          `cd ${shellEscape(room.path)} && ls -la`,
        ]);
        return callback({ success: true, files: output });
      } catch (error) {
        return callback({ success: false, message: error.message || "Failed" });
      }
    });

    // =========================
    // 4. START TERMINAL
    // =========================
    socket.on("start-terminal", async ({ inviteToken, terminalId = "terminal-1" } = {}) => {
      const room_inviteToken = inviteToken || socket.room_inviteToken;
      const shellKey = getTerminalSessionKey(socket.id, terminalId);

      if (roomShellMap.has(shellKey)) return;

      try {
        const { room, containerId } = await getRoomAndContainer(socket, room_inviteToken);
        const shell = spawn("docker", [
          "exec",
          "-i",
          containerId,
          "script",
          "-qefc",
          `cd ${shellEscape(room?.path || "/home/user")} && export TERM=xterm-256color && exec bash -i`,
          "/dev/null",
        ], {
          env: {
            ...process.env,
            TERM: "xterm-256color",
          },
        });
        roomShellMap.set(shellKey, shell);

        shell.stdout.on("data", (data) => {
          io.to(socket.id).emit("terminal-output", { terminalId, data: data.toString() });
        });

        shell.stderr.on("data", (data) => {
          io.to(socket.id).emit("terminal-output", { terminalId, data: data.toString() });
        });

        shell.on("close", () => {
          roomShellMap.delete(shellKey);
          io.to(socket.id).emit("terminal-output", { terminalId, data: "\r\n[terminal closed]\r\n" });
        });
      } catch (error) {
        io.to(socket.id).emit("terminal-output", {
          terminalId,
          data: `\r\n[terminal error] ${error.message}\r\n`,
        });
      }
    });

    // =========================
    // 5. TERMINAL INPUT
    // =========================
    socket.on("terminal-input", ({ terminalId = "terminal-1", data } = {}) => {
      const shell = roomShellMap.get(getTerminalSessionKey(socket.id, terminalId));
      if (shell?.stdin?.writable) {
        shell.stdin.write(data);
      }
    });

    // =========================
    // 6. READ FILE
    // =========================
    socket.on("read-file", async ({ fileName }, callback) => {
      try {
        if (!isValidFileName(fileName)) {
          return callback({ success: false });
        }

        const { containerId } = await getRoomAndContainer(socket);
        const content = await runDocker(["exec", containerId, "cat", fileName]);

        return callback({ success: true, content });
      } catch (error) {
        return callback({ success: false, message: error.message || "Failed to read file" });
      }
    });

    // =========================
    // 7. WRITE FILE
    // =========================
    socket.on("write-file", async ({ fileName, content }, callback) => {
      try {
        if (!isValidFileName(fileName)) {
          return callback({ success: false });
        }

        const { containerId } = await getRoomAndContainer(socket);
        const base64Content = Buffer.from(content).toString("base64");

        await runDocker([
          "exec",
          containerId,
          "bash",
          "-c",
          `echo "${base64Content}" | base64 -d > ${shellEscape(fileName)}`,
        ]);

        return callback({ success: true });
      } catch (error) {
        return callback({ success: false, message: error.message || "Failed to write file" });
      }
    });

    socket.on("create-file", async ({ fileName }, callback) => {
      try {
        if (!isValidFileName(fileName)) {
          return callback({ success: false, message: "Invalid file name" });
        }

        const { containerId } = await getRoomAndContainer(socket);
        await runDocker([
          "exec",
          containerId,
          "bash",
          "-lc",
          `mkdir -p "$(dirname ${shellEscape(fileName)})" && touch ${shellEscape(fileName)}`,
        ]);

        emitWorkspaceUpdate(socket, {
          type: "create-file",
          path: fileName,
        });

        return callback({ success: true });
      } catch (error) {
        return callback({ success: false, message: error.message || "Failed to create file" });
      }
    });

    socket.on("create-folder", async ({ folderName }, callback) => {
      try {
        if (!isValidFileName(folderName)) {
          return callback({ success: false, message: "Invalid folder name" });
        }

        const { containerId } = await getRoomAndContainer(socket);
        await runDocker([
          "exec",
          containerId,
          "bash",
          "-lc",
          `mkdir -p ${shellEscape(folderName)}`,
        ]);

        emitWorkspaceUpdate(socket, {
          type: "create-folder",
          path: folderName,
        });

        return callback({ success: true });
      } catch (error) {
        return callback({ success: false, message: error.message || "Failed to create folder" });
      }
    });

    socket.on("rename-entry", async ({ oldPath, newPath }, callback) => {
      try {
        if (!isValidFileName(oldPath) || !isValidFileName(newPath)) {
          return callback({ success: false, message: "Invalid path" });
        }

        const { containerId } = await getRoomAndContainer(socket);
        await runDocker([
          "exec",
          containerId,
          "bash",
          "-lc",
          `mkdir -p "$(dirname ${shellEscape(newPath)})" && mv ${shellEscape(oldPath)} ${shellEscape(newPath)}`,
        ]);

        emitWorkspaceUpdate(socket, {
          type: "rename-entry",
          oldPath,
          newPath,
        });

        return callback({ success: true });
      } catch (error) {
        return callback({ success: false, message: error.message || "Failed to rename entry" });
      }
    });

    socket.on("delete-entry", async ({ targetPath }, callback) => {
      try {
        if (!isValidFileName(targetPath)) {
          return callback({ success: false, message: "Invalid path" });
        }

        const { containerId } = await getRoomAndContainer(socket);
        await runDocker([
          "exec",
          containerId,
          "bash",
          "-lc",
          `rm -rf ${shellEscape(targetPath)}`,
        ]);

        emitWorkspaceUpdate(socket, {
          type: "delete-entry",
          path: targetPath,
        });

        return callback({ success: true });
      } catch (error) {
        return callback({ success: false, message: error.message || "Failed to delete entry" });
      }
    });

    // =========================
    // 8. CODE SYNC
    // =========================
    socket.on("code-change", (data) => {
      socket.to(socket.room_inviteToken).emit("code-change", {
        ...data,
        userId: socket.userId,
        name: socket.userName,
        avatar: socket.userAvatar,
        color: socket.userColor,
      });
    });

    // =========================
    // 9. CURSOR
    // =========================
    socket.on("cursor-move", (data) => {
      socket.to(socket.room_inviteToken).emit("cursor-update", {
        userId: socket.userId,
        position: data.position,
        color: socket.userColor,
      });
    });

    // =========================
    // 10. CHAT
    // =========================
    socket.on("send-message", async ({ message }, callback) => {
      try {
        const room_inviteToken = socket.room_inviteToken;
        const room_id = socket.room_id;

        if (!room_id) return callback({ success: false });

        const payload = {
          userId: socket.userId,
          username: socket.userName,
          avatar: socket.userAvatar,
          userColor: socket.userColor,
          message,
          time: new Date(),
        };

        io.to(room_inviteToken).emit("receive-message", payload);

        await Message.create({
          room_id: room_id, // ✅ DB uses _id
          user: socket.userId,
          content: message,
          ok: true,
        });

        return callback({ success: true });
      } catch {
        return callback({ success: false });
      }
    });

    // =========================
    // 11. GET MESSAGES
    // =========================
    socket.on("get-messages", async ({ limit = 50 }, callback) => {
      try {
        if (!socket.room_id) return callback({ success: false });

        const messages = await Message.find({ room_id: socket.room_id })
          .sort({ createdAt: -1 })
          .limit(limit)
          .populate("user", "name avatar oauthImage userColor");

        return callback({
          success: true,
          messages: messages.reverse(),
        });
      } catch {
        return callback({ success: false });
      }
    });

    // =========================
    // 13. TYPING
    // =========================
    socket.on("typing", () => {
      socket.to(socket.room_inviteToken).emit("typing", {
        userId: socket.userId,
        name: socket.userName,
        avatar: socket.userAvatar,
      });
    });

    socket.on("stop-typing", () => {
      socket.to(socket.room_inviteToken).emit("stop-typing", {
        userId: socket.userId,
      });
    });

    // =========================
    // 12. DISCONNECT
    // =========================
    socket.on("disconnect", () => {
      const room_inviteToken = socket.room_inviteToken;
      closeSocketTerminals(socket);

      const userRemoved = removeUserFromRoom(socket);
      if (userRemoved) {
        socket.to(room_inviteToken).emit("user-left", {
          userId: socket.userId,
          name: socket.userName,
          email: socket.userEmail,
          avatar: socket.userAvatar,
          userColor: socket.userColor,
        });
      }

      const users = roomUsers.get(room_inviteToken);
      if (users?.size === 0) {
        roomUsers.delete(room_inviteToken);
        roomUserSockets.delete(room_inviteToken);
        roomPresenceMap.delete(room_inviteToken);
      }

      if (userSocketMap.get(socket.userId) === socket.id) {
        userSocketMap.delete(socket.userId);
      }
    });
  });

  return io;
};

export { startIoServer };
