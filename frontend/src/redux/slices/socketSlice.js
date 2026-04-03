import { createSlice } from "@reduxjs/toolkit";

const socketSlice = createSlice({
  name: "socket",
  initialState: {
    status: "disconnected",
    approvalRequests: [],
    joinState: "idle",
    joinMessage: "",
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
  },
});

export const { addApprovalRequest, removeApprovalRequest, setJoinState, setSocketStatus } =
  socketSlice.actions;

export default socketSlice.reducer;
