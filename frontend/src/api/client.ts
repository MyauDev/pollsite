import axios from "axios";

const api = axios.create({
  baseURL: "/api", // Vite proxy will forward to http://localhost:8000/api
  withCredentials: true, // Django uses auth cookies for JWT
  headers: {
    "Content-Type": "application/json",
  },
});

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