import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../../services/api";
import { disconnectSocket } from "../../services/socket";

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || "Something went wrong";

export const signup = createAsyncThunk(
  "auth/signup",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await api.post("/api/users/signup", payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const verifyOtp = createAsyncThunk(
  "auth/verifyOtp",
  async (payload, { rejectWithValue, dispatch }) => {
    try {
      const response = await api.post("/api/users/verify-otp", payload);
      await dispatch(refreshAccessToken()).unwrap();
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const login = createAsyncThunk(
  "auth/login",
  async (payload, { rejectWithValue, dispatch }) => {
    try {
      const response = await api.post("/api/users/login", payload);
      await dispatch(refreshAccessToken()).unwrap();
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const getMe = createAsyncThunk(
  "auth/getMe",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/api/users/me");
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const refreshAccessToken = createAsyncThunk(
  "auth/refreshAccessToken",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/api/users/refresh-token");
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const logout = createAsyncThunk(
  "auth/logout",
  async (_, { rejectWithValue, dispatch }) => {
    try {
      await api.post("/api/users/logout");
      disconnectSocket();
      dispatch(logoutLocal());
      return true;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

const initialState = {
  user: null,
  accessToken: "",
  pendingEmail: "",
  isAuthenticated: false,
  isBootstrapping: true,
  loading: false,
  error: "",
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = "";
    },
    setPendingEmail(state, action) {
      state.pendingEmail = action.payload;
    },
    setAccessToken(state, action) {
      state.accessToken = action.payload || "";
    },
    logoutLocal(state) {
      state.user = null;
      state.accessToken = "";
      state.isAuthenticated = false;
      state.isBootstrapping = false;
      state.loading = false;
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signup.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.loading = false;
        state.pendingEmail = action.meta.arg.email;
      })
      .addCase(signup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.data;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(verifyOtp.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.data;
        state.isAuthenticated = true;
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getMe.pending, (state) => {
        state.loading = true;
      })
      .addCase(getMe.fulfilled, (state, action) => {
        state.loading = false;
        state.isBootstrapping = false;
        state.isAuthenticated = true;
        state.user = action.payload.data;
      })
      .addCase(getMe.rejected, (state) => {
        state.loading = false;
        state.isBootstrapping = false;
        state.isAuthenticated = false;
        state.user = null;
      })
      .addCase(refreshAccessToken.fulfilled, (state, action) => {
        state.accessToken = action.payload.data.accessToken;
      })
      .addCase(refreshAccessToken.rejected, (state) => {
        state.accessToken = "";
      });
  },
});

export const { clearAuthError, logoutLocal, setAccessToken, setPendingEmail } =
  authSlice.actions;

export default authSlice.reducer;
