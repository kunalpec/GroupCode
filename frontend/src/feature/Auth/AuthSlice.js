import { createSlice } from "@reduxjs/toolkit";
import { LoginUserThunk, SignupUserThunk, VerifyOTPThunk } from "./Auththunk";

const initialState = {
  user: null,
  loading: false,
  error: null,
  isAuthenticated: false,
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    // Optional helper to clear errors when the user switches forms
    clearAuthError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // --- LOGIN ---
      .addCase(LoginUserThunk.pending, (state) => {
        state.loading = true;
        state.error = null; // Clear old error when trying again
      })
      .addCase(LoginUserThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        // Accessing .data because of your ApiResponse class
        state.user = action.payload.data; 
      })
      .addCase(LoginUserThunk.rejected, (state, action) => {
        state.loading = false;
        // This is the message from thunkAPI.rejectWithValue
        state.error = action.payload; 
      })

      // --- SIGNUP ---
      .addCase(SignupUserThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(SignupUserThunk.fulfilled, (state) => {
        state.loading = false;
        state.isAuthenticated = false; 
        state.user = null; // Ensure user is null until OTP is verified
      })
      .addCase(SignupUserThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // --- VERIFY OTP ---
      .addCase(VerifyOTPThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(VerifyOTPThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true; // Success!
        // We save the user data returned by the verifyOTP controller
        state.user = action.payload.data; 
      })
      .addCase(VerifyOTPThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

// Exporting actions
export const { logout, clearAuthError } = authSlice.actions;

// Exporting reducer
export default authSlice.reducer;