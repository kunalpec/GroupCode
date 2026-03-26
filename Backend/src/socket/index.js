import { Room } from "../model/room.model.js";
import { Server } from "socket.io";
import { runDocker } from "../util/docker.util.js";
import { spawn } from "child_process";
import { Message } from "../model/message.model.js";
import { socketAuthMiddleware } from "../middleware/socket.middleware.js";

let io;

// roomId → Set(userId)
const roomUsers = new Map();

// userId → socket.id
const userSocketMap = new Map();

// roomId → containerId
export const roomContainerMap = new Map();

// roomId → shell process
const roomShellMap = new Map();

// 🔧 Helper: Add user safely
async function addUserToRoom(room, socket) {
  const { userId, roomId } = socket;

  // DB
  if (!room.users.includes(userId)) {
    room.users.push(userId);
    await room.save();
  }

  // Memory
  if (!roomUsers.has(roomId)) {
    roomUsers.set(roomId, new Set());
  }
  roomUsers.get(roomId).add(userId);

  userSocketMap.set(userId, socket.id);
}

// 🔧 Helper: basic filename sanitize
function isValidFileName(fileName) {
  return !fileName.includes("..");
}

const startIoServer = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

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

        socket.roomId = inviteToken;

        // ✅ Prevent duplicate join
        if (room.users.includes(socket.userId)) {
          socket.join(inviteToken);
          return callback({
            success: true,
            message: "Already in room",
            roomName: room.roomName,
            users: room.users,
          });
        }

        // 🟢 OWNER → direct join
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

        // 🟡 USER → request approval
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

      // 🔐 Only owner allowed
      if (room.owner.toString() !== socket.userId.toString()) return;

      const targetSocket = io.sockets.sockets.get(socketId);
      if (!targetSocket) return;

      if (action === "accept") {
        targetSocket.join(roomId);
        targetSocket.roomId = roomId;

        await addUserToRoom(room, targetSocket);

        // notify user
        io.to(socketId).emit("join-approved", {
          roomId,
          roomName: room.roomName,
        });

        // notify others
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
        const containerId = roomContainerMap.get(socket.roomId);
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
      const roomId = socket.roomId;
      const containerId = roomContainerMap.get(roomId);

      if (!containerId || roomShellMap.has(roomId)) return;

      const shell = spawn("docker", ["exec", "-i", containerId, "bash"]);
      roomShellMap.set(roomId, shell);

      shell.stdout.on("data", (data) => {
        io.to(roomId).emit("terminal-output", data.toString());
      });

      shell.stderr.on("data", (data) => {
        io.to(roomId).emit("terminal-output", data.toString());
      });

      shell.on("close", () => {
        roomShellMap.delete(roomId);
      });
    });

    // =========================
    // 5. TERMINAL INPUT
    // =========================
    socket.on("terminal-input", (data) => {
      const shell = roomShellMap.get(socket.roomId);
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
          return callback({ success: false, message: "Invalid file name" });
        }

        const containerId = roomContainerMap.get(socket.roomId);
        const content = await runDocker(["exec", containerId, "cat", fileName]);

        return callback({ success: true, content });

      } catch {
        return callback({ success: false, message: "Read failed" });
      }
    });

    // =========================
    // 7. WRITE FILE
    // =========================
    socket.on("write-file", async ({ fileName, content }, callback) => {
      try {
        if (!isValidFileName(fileName)) {
          return callback({ success: false, message: "Invalid file name" });
        }

        const containerId = roomContainerMap.get(socket.roomId);

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
        return callback({ success: false, message: "Write failed" });
      }
    });

    // =========================
    // 8. CODE SYNC
    // =========================
    socket.on("code-change", (data) => {
      socket.to(socket.roomId).emit("code-change", {
        ...data,
        userId: socket.userId,
        name: socket.userName,
        avatar: socket.userAvatar,
        color: socket.userColor,
      });
    });

    // =========================
    // 9. CURSOR TRACKING
    // =========================
    socket.on("cursor-move", (data) => {
      socket.to(socket.roomId).emit("cursor-update", {
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
        const roomId = socket.roomId;

        const payload = {
          userId: socket.userId,
          username: socket.userName,
          avatar: socket.userAvatar,
          userColor: socket.userColor,
          message,
          time: new Date(),
        };

        io.to(roomId).emit("receive-message", payload);

        await Message.create({
          room_id: roomId,
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
        const messages = await Message.find({ room_id: socket.roomId })
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
      const roomId = socket.roomId;

      const users = roomUsers.get(roomId);
      if (users) {
        users.delete(socket.userId);

        socket.to(roomId).emit("user-left", {
          userId: socket.userId,
        });

        if (users.size === 0) {
          const shell = roomShellMap.get(roomId);
          if (shell) shell.kill();

          roomShellMap.delete(roomId);
          roomUsers.delete(roomId);
        }
      }

      userSocketMap.delete(socket.userId);
    });
  });

  return io;
};

export { startIoServer };

// Feature,Difficulty,Why it matters
// Admin Approval,Medium,Keeps the room private and secure.
// Cursor Tracking,Low,"Makes the app feel ""alive"" and collaborative."
// xterm.js Integration,High,"Provides a ""real"" Linux terminal experience."
// Docker Cleanup,Medium,Saves you from massive server bills/crashes.

