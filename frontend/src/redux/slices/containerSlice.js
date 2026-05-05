import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../../services/api";

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || "Something went wrong";

export const createContainer = createAsyncThunk(
  "container/createContainer",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post("/api/container/create");
      return response.data;
    } catch (error) {
      if (error?.response?.status === 409) {
        return {
          success: true,
          data: {
            containerId: "existing",
          },
        };
      }
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const fetchContainerInfo = createAsyncThunk(
  "container/fetchContainerInfo",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/api/container/info");
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const fetchContainerStatus = createAsyncThunk(
  "container/fetchContainerStatus",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/api/container/status");
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

const containerSlice = createSlice({
  name: "container",
  initialState: {
    containerId: "",
    services: {},
    status: "unknown",
    loading: false,
    statusLoading: false,
    initialized: false,
    error: "",
    lastSyncedAt: "",
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(createContainer.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(createContainer.fulfilled, (state, action) => {
        state.loading = false;
        state.initialized = true;
        state.containerId = action.payload?.data?.containerId || "existing";
        state.services = action.payload?.data?.services || {};
        state.lastSyncedAt = new Date().toISOString();
      })
      .addCase(createContainer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchContainerInfo.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(fetchContainerInfo.fulfilled, (state, action) => {
        state.loading = false;
        state.initialized = true;
        state.containerId = action.payload?.data?.containerId || state.containerId;
        state.services = action.payload?.data?.services || {};
        state.lastSyncedAt = new Date().toISOString();
      })
      .addCase(fetchContainerInfo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchContainerStatus.pending, (state) => {
        state.statusLoading = true;
      })
      .addCase(fetchContainerStatus.fulfilled, (state, action) => {
        state.statusLoading = false;
        state.initialized = true;
        state.status = action.payload?.data?.status || "unknown";
        state.lastSyncedAt = new Date().toISOString();
      })
      .addCase(fetchContainerStatus.rejected, (state, action) => {
        state.statusLoading = false;
        state.error = action.payload;
      });
  },
});

export default containerSlice.reducer;
