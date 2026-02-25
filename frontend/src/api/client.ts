import axios from "axios";

const backendUrl = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");

const api = axios.create({
  baseURL: backendUrl + "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Prevent multiple simultaneous 401 redirects (e.g. when 8 parallel requests all fail)
let isRedirectingToLogin = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isRedirectingToLogin) {
      isRedirectingToLogin = true;
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
