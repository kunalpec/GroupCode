import { api } from "../../Api.js";

// 1. Use POST for security
// 2. Remove the extra "/api" from the string
export const LoginAPI = async (data) => {
  try {
    const res = await api.post("api/users/login", data); 
    return res.data; // Return just the data, not the whole Axios object
  } catch (err) {
    // 3. THROW the error so the "Stop Sign" works!
    throw err; 
  }
};

export const SignupAPI = async (data) => {
  try {
    const res = await api.post("api/users/signup", data);
    return res.data;
  } catch (err) {
    throw err;
  }
};


export const VerifyOTPAPI = async (data) => {
  try {
    const res = await api.post("api/users/verify-otp", data);
    return res.data;
    } catch (err) {
    throw err;
  }
};

