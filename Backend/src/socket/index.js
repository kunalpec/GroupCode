import { Room } from "../model/room.model.js";
import { Server } from "socket.io";
import { runDocker } from "../util/docker.util.js";
import { spawn } from "child_process";
import { Message } from "../model/message.model.js";
import { socketAuthMiddleware } from "../middleware/socket.middleware.js";

let io;

// room_inviteToken → Set(userId)
const roomUsers = new Map();

// userId → socket.id
const userSocketMap = new Map();

// room_inviteToken → containerId
export const roomContainerMap = new Map();

// room_inviteToken → shell process
const roomShellMap = new Map();

// =========================
// 🔧 Helper
// =========================
async function addUserToRoom(room, socket) {
  const { userId, room_inviteToken } = socket;

  if (!room.users.includes(userId)) {
    room.users.push(userId);
    await room.save();
  }

  if (!roomUsers.has(room_inviteToken)) {
    roomUsers.set(room_inviteToken, new Set());
  }

  roomUsers.get(room_inviteToken).add(userId);
  userSocketMap.set(userId, socket.id);
}

function isValidFileName(fileName) {
  return !fileName.includes("..");
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
        socket.room_id = room._id;             // DB layer

        // duplicate join
        if (room.users.includes(socket.userId)) {
          socket.join(inviteToken);
          return callback({
            success: true,
            message: "Already in room",
            roomName: room.roomName,
            users: room.users,
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
        });

        targetSocket.to(roomId).emit("user-joined-notification", {
          userId: targetSocket.userId,
          name: targetSocket.userName,
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
        const containerId = roomContainerMap.get(socket.room_inviteToken);
        if (!containerId) {
          return callback({ success: false, message: "No container" });
        }

        const output = await runDocker(["exec", containerId, "ls", "-la"]);
        return callback({ success: true, files: output });

      } catch {
        return callback({ success: false, message: "Failed" });
      }
    });

    // =========================
    // 4. START TERMINAL
    // =========================
    socket.on("start-terminal", async () => {
      const room_inviteToken = socket.room_inviteToken;
      const containerId = roomContainerMap.get(room_inviteToken);

      if (!containerId || roomShellMap.has(room_inviteToken)) return;

      const shell = spawn("docker", ["exec", "-i", containerId, "bash"]);
      roomShellMap.set(room_inviteToken, shell);

      shell.stdout.on("data", (data) => {
        io.to(room_inviteToken).emit("terminal-output", data.toString());
      });

      shell.stderr.on("data", (data) => {
        io.to(room_inviteToken).emit("terminal-output", data.toString());
      });

      shell.on("close", () => {
        roomShellMap.delete(room_inviteToken);
      });
    });

    // =========================
    // 5. TERMINAL INPUT
    // =========================
    socket.on("terminal-input", (data) => {
      const shell = roomShellMap.get(socket.room_inviteToken);
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

        const containerId = roomContainerMap.get(socket.room_inviteToken);
        const content = await runDocker(["exec", containerId, "cat", fileName]);

        return callback({ success: true, content });

      } catch {
        return callback({ success: false });
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

        const containerId = roomContainerMap.get(socket.room_inviteToken);
        const base64Content = Buffer.from(content).toString("base64");

        await runDocker([
          "exec",
          containerId,
          "bash",
          "-c",
          `echo "${base64Content}" | base64 -d > ${fileName}`,
        ]);

        return callback({ success: true });

      } catch {
        return callback({ success: false });
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
          .populate("user", "name avatar userColor");

        return callback({
          success: true,
          messages: messages.reverse(),
        });

      } catch {
        return callback({ success: false });
      }
    });

    // =========================
    // 12. DISCONNECT
    // =========================
    socket.on("disconnect", () => {
      const room_inviteToken = socket.room_inviteToken;

      const users = roomUsers.get(room_inviteToken);
      if (users) {
        users.delete(socket.userId);

        socket.to(room_inviteToken).emit("user-left", {
          userId: socket.userId,
        });

        if (users.size === 0) {
          const shell = roomShellMap.get(room_inviteToken);
          if (shell) shell.kill();

          roomShellMap.delete(room_inviteToken);
          roomUsers.delete(room_inviteToken);
        }
      }

      userSocketMap.delete(socket.userId);
    });
  });

  return io;
};

export { startIoServer };