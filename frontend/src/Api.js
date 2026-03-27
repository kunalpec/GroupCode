import axios from "axios";

const BACKEND_URL = "http://localhost:3000";

// Axios client for all api call ok 
export const api = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json"
  },
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 1. Check if error is 401 (Unauthorized) and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // 2. Attempt to refresh the token
        // Since withCredentials: true is set, cookies will be sent automatically
        await axios.post(`${BACKEND_URL}/api/users/refresh-token`, {}, { 
          withCredentials: true 
        });

        // 3. If refresh is successful, retry the original request
        return api(originalRequest);
        
      } catch (refreshError) {
        // 4. If refresh token is also expired or fails, log them out
        console.error("Refresh token expired. Redirecting to login...");
        window.location.href = "/login"; 
        // if refreshToken Fail ok 
        return Promise.reject(refreshError);
      }
    }
    // if status is different like 400, 405,5xx or ok 
    return Promise.reject(error);
  }
);