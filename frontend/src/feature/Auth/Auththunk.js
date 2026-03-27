import { createAsyncThunk } from "@reduxjs/toolkit";
import { LoginAPI, SignupAPI } from "./AuthApi.js"; // Import your API functions

export const LoginUserThunk=createAsyncThunk(
  "auth/loign",
  async(userData,ThunkAPI)=>{
    try {
      const res=await LoginAPI(userData);
      return res; // Goes to 'fulfilled'
    } catch (error) {
      // We extract the error message from the Axios error
      const message = error.response?.data?.message || error.message;
      return ThunkAPI.rejectWithValue(message); // Goes to 'rejected'
    }
  }
);

export const SignupUserThunk=createAsyncThunk(
  "auth/signup",
  async(userData,ThunkAPI)=>{
    try {
      const res=await SignupAPI(userData);
      return res; // Goes to fulfilled'
    }catch(error){
      const message =error.response?.data?.message || error.message;
      return ThunkAPI.rejectWithValue(message); // Goes to rejected
    }
  }
);

export const VerifyOTPThunk=createAsyncThunk(
  "auth/verifyotp",
  async(userData,ThunkAPI)=>{
    try {
      const res=await VerifyOTPAPI(userData);
      return res; // Goes to fulfilled
    }catch(error){
      const message =error.response?.data?.message || error.message;
      return ThunkAPI.rejectWithValue(message); // Goes to rejected
    }
  }
);