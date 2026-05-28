/**
 * Antigravity Food Scanner — Axios API Client
 * =============================================
 * Pre-configured Axios instance with timeout, base URL,
 * and request/response interceptors for production reliability.
 */

import axios from "axios";

// ── Configuration ───────────────────────────────────────────────────────────
// Update this to your machine's local network IP when testing on a physical
// device. Use "http://localhost:8000" for iOS simulator or
// "http://10.0.2.2:8000" for Android emulator.
const BASE_URL = "http://192.168.1.45:8000";
const REQUEST_TIMEOUT_MS = 10000; // 10-second gateway timeout

// ── Axios Instance ──────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    Accept: "application/json",
  },
});

// ── Request Interceptor ─────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    if (__DEV__) {
      console.log(
        `[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`
      );
    }
    return config;
  },
  (error) => {
    if (__DEV__) {
      console.error("[API] Request setup error:", error.message);
    }
    return Promise.reject(error);
  }
);

// ── Response Interceptor ────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log(`[API] Response ${response.status}:`, response.data);
    }
    return response;
  },
  (error) => {
    // Normalize error messages for the UI layer
    let userMessage = "Something went wrong. Please try again.";

    if (error.code === "ECONNABORTED") {
      userMessage =
        "The request timed out. Please check your connection and try again.";
    } else if (error.code === "ERR_NETWORK" || !error.response) {
      userMessage =
        "Unable to reach the server. Make sure the backend is running and your device is on the same network.";
    } else if (error.response) {
      const status = error.response.status;
      if (status === 413) {
        userMessage = "The image is too large. Please try a smaller photo.";
      } else if (status === 400) {
        userMessage =
          error.response.data?.detail?.message ||
          "Invalid request. Please try a different photo.";
      } else if (status >= 500) {
        userMessage = "Server error. Please try again in a moment.";
      }
    }

    if (__DEV__) {
      console.error("[API] Error:", error.message, error.response?.data);
    }

    // Attach user-friendly message to the error object
    error.userMessage = userMessage;
    return Promise.reject(error);
  }
);

export default api;
