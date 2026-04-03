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

const containerSlice = createSlice({
  name: "container",
  initialState: {
    containerId: "",
    loading: false,
    initialized: false,
    error: "",
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
      })
      .addCase(createContainer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default containerSlice.reducer;
