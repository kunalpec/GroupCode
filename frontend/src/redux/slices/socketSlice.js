import { createSlice } from "@reduxjs/toolkit";

const socketSlice = createSlice({
  name: "socket",
  initialState: {
    status: "disconnected",
    approvalRequests: [],
    joinState: "idle",
    joinMessage: "",
    roomUsers: [],
  },
  reducers: {
    setSocketStatus(state, action) {
      state.status = action.payload;
    },
    setJoinState(state, action) {
      state.joinState = action.payload.state;
      state.joinMessage = action.payload.message || "";
    },
    addApprovalRequest(state, action) {
      state.approvalRequests.push(action.payload);
    },
    removeApprovalRequest(state, action) {
      state.approvalRequests = state.approvalRequests.filter(
        (request) => request.socketId !== action.payload,
      );
    },
    setRoomUsers(state, action) {
      state.roomUsers = action.payload || [];
    },
  },
});

export const { addApprovalRequest, removeApprovalRequest, setJoinState, setSocketStatus, setRoomUsers } =
  socketSlice.actions;

export default socketSlice.reducer;
