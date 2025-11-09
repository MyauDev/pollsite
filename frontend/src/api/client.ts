import axios from "axios";
import { getOrCreateDeviceId } from "../utils/device";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true, // Send cookies with requests
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add device ID header
api.interceptors.request.use(
  (config) => {
    // Add device ID to all requests
    const deviceId = getOrCreateDeviceId();
    config.headers['X-Device-Id'] = deviceId;
    
    // Log device ID for debugging
    if (config.url?.includes('/polls')) {
      console.log('API Request:', config.method?.toUpperCase(), config.url, 'Device-ID:', deviceId);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Request interceptor for adding tokens if needed
api.interceptors.request.use(
  (config) => {
    // Cookies are automatically included with withCredentials: true
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Prevent infinite retry loops
    if (originalRequest._retry) {
      return Promise.reject(error);
    }
    
    // Only try to refresh on 401 errors (except for auth endpoints themselves)
    if (error.response?.status === 401 && !originalRequest.url?.includes("/auth/")) {
      originalRequest._retry = true;
      
      try {
        await api.post("/auth/token/refresh/");
        // Retry the original request
        return api.request(originalRequest);
      } catch (refreshError) {
        // Token refresh failed - user needs to login
        // Don't redirect automatically, let the app handle it
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;