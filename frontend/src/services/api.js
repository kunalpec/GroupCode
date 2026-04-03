import axios from "axios";
import { logoutLocal, setAccessToken } from "../redux/slices/authSlice";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") || "http://localhost:3000";

let storeRef;
let refreshPromise = null;

export const api = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true,
});

export function setApiStore(store) {
  storeRef = store;
}

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = axios
      .get(`${BACKEND_URL}/api/users/refresh-token`, { withCredentials: true })
      .then((response) => {
        const accessToken = response?.data?.data?.accessToken || "";
        if (storeRef && accessToken) {
          storeRef.dispatch(setAccessToken(accessToken));
        }
        return accessToken;
      })
      .catch((error) => {
        if (storeRef) {
          storeRef.dispatch(logoutLocal());
        }
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

api.interceptors.request.use((config) => {
  const token = storeRef?.getState()?.auth?.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isUnauthorized = error.response?.status === 401;
    const isRefreshRequest = originalRequest?.url?.includes("/refresh-token");

    if (!isUnauthorized || originalRequest?._retry || isRefreshRequest) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const accessToken = await refreshSession();
      if (accessToken) {
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      }
      return api(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  },
);

export { BACKEND_URL, refreshSession };
