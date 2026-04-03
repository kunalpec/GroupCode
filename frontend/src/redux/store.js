import { configureStore } from "@reduxjs/toolkit";
import { setApiStore } from "../services/api";
import authReducer from "./slices/authSlice";
import chatReducer from "./slices/chatSlice";
import containerReducer from "./slices/containerSlice";
import roomReducer from "./slices/roomSlice";
import socketReducer from "./slices/socketSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    container: containerReducer,
    room: roomReducer,
    socket: socketReducer,
    chat: chatReducer,
  },
});

setApiStore(store);
