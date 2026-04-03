import { io } from "socket.io-client";
import { BACKEND_URL } from "./api";

let socket;

export function connectSocket(accessToken) {
  if (socket) {
    socket.auth = {
      token: accessToken,
    };
    if (!socket.connected) {
      socket.connect();
    }
    return socket;
  }

  socket = io(BACKEND_URL, {
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    transports: ["websocket", "polling"],
    auth: {
      token: accessToken,
    },
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = undefined;
  }
}
