import { createSlice } from "@reduxjs/toolkit";

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    messages: [],
    typingUsers: [],
  },
  reducers: {
    setMessages(state, action) {
      state.messages = action.payload;
    },
    addMessage(state, action) {
      state.messages.push(action.payload);
    },
    setTypingUser(state, action) {
      const exists = state.typingUsers.find((user) => user.userId === action.payload.userId);
      if (!exists) {
        state.typingUsers.push(action.payload);
      }
    },
    clearTypingUser(state, action) {
      state.typingUsers = state.typingUsers.filter((user) => user.userId !== action.payload);
    },
    resetChat(state) {
      state.messages = [];
      state.typingUsers = [];
    },
  },
});

export const { addMessage, clearTypingUser, resetChat, setMessages, setTypingUser } =
  chatSlice.actions;

export default chatSlice.reducer;
