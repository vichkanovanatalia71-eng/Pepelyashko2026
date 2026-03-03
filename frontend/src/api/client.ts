import axios from "axios";

const backendUrl = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");

const api = axios.create({
  baseURL: backendUrl + "/api",
  timeout: 30_000, // 30s — prevents infinite hang on Railway cold start
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Retry on 502/503/504 (Railway cold start) — up to 2 retries with backoff
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    const status = error.response?.status;
    const isTimeout = error.code === "ECONNABORTED";

    if (
      (status === 502 || status === 503 || status === 504 || isTimeout) &&
      (!config._retryCount || config._retryCount < 2)
    ) {
      config._retryCount = (config._retryCount || 0) + 1;
      const delay = config._retryCount * 3_000; // 3s, 6s
      await new Promise((r) => setTimeout(r, delay));
      return api(config);
    }

    // On 401: fire a custom event instead of hard redirect.
    // AuthProvider listens for this event and handles logout via React state.
    // This avoids window.location.href which causes issues on mobile browsers
    // and race conditions when multiple concurrent requests all return 401.
    if (status === 401) {
      window.dispatchEvent(new CustomEvent("auth:expired"));
    }
    return Promise.reject(error);
  }
);

export default api;
