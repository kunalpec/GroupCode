import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../../services/api";

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || "Something went wrong";

export const createRoom = createAsyncThunk(
  "room/createRoom",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await api.post("/api/room/create", payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const getRooms = createAsyncThunk(
  "room/getRooms",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/api/room/all");
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const getRoomDirectory = createAsyncThunk(
  "room/getRoomDirectory",
  async (roomId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/room/directory/${roomId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const deleteRoom = createAsyncThunk(
  "room/deleteRoom",
  async (roomId, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/api/room/delete/${roomId}`);
      return { roomId, payload: response.data };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

const roomSlice = createSlice({
  name: "room",
  initialState: {
    rooms: [],
    currentRoom: null,
    files: [],
    entries: [],
    inviteLink: "",
    loading: false,
    error: "",
  },
  reducers: {
    setCurrentRoom(state, action) {
      state.currentRoom = action.payload;
    },
    resetRoomWorkspace(state) {
      state.currentRoom = null;
      state.files = [];
      state.entries = [];
    },
    clearRoomError(state) {
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getRooms.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(getRooms.fulfilled, (state, action) => {
        state.loading = false;
        state.rooms = action.payload.data.rooms || [];
      })
      .addCase(getRooms.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createRoom.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(createRoom.fulfilled, (state, action) => {
        state.loading = false;
        state.inviteLink = action.payload.data.inviteLink;
        state.rooms.unshift(action.payload.data.room);
      })
      .addCase(createRoom.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteRoom.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(deleteRoom.fulfilled, (state, action) => {
        state.loading = false;
        state.rooms = state.rooms.filter((room) => room._id !== action.payload.roomId);
        if (state.currentRoom?._id === action.payload.roomId) {
          state.currentRoom = null;
          state.files = [];
          state.entries = [];
        }
      })
      .addCase(deleteRoom.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getRoomDirectory.fulfilled, (state, action) => {
        state.files = action.payload.data.files || [];
        state.entries = action.payload.data.entries || [];
      })
      .addCase(getRoomDirectory.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { clearRoomError, resetRoomWorkspace, setCurrentRoom } = roomSlice.actions;

export default roomSlice.reducer;
