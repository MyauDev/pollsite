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
    if (error.response?.status === 401) {
      // Try to refresh the token
      try {
        await api.post("/auth/token/refresh");
        // Retry the original request
        return api.request(error.config);
      } catch (refreshError) {
        // Redirect to login if refresh fails
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;