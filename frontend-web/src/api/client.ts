import axios, { type AxiosError, type AxiosInstance } from "axios";

export type Book = {
  uuid: string;
  id?: string;
  title: string;
  author: string;
  owner_username?: string | null;
  description?: string;
  is_already_cached: boolean;
  source_id?: string | null;
  source_type?: string;
};

export type Task = {
  uuid: string;
  title: string;
  completed: boolean;
  is_overdue?: boolean;
  category?: { name: string } | null;
};

export type Category = {
  id: number;
  name: string;
  color: string;
  task_count: number;
};

export type LoginResponse = {
  access: string;
  refresh: string;
};

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api";

// DRF's paginated list responses look like { count, next, previous, results }.
// Custom @action endpoints that return Response(list) directly (e.g.
// /books/search/) do NOT get wrapped this way. This helper normalizes both
// shapes so callers don't have to know which one they're getting.
export function unwrapResults<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : data.results;
}

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === "string") return data;
    if (data && typeof data === "object") return JSON.stringify(data);
    return error.message;
  }
  return "Something went wrong.";
}

export const API: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attaches the JWT access token to every request.
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On a 401, try exactly once to refresh the access token via
// /login/refresh/ and replay the original request. ACCESS_TOKEN_LIFETIME
// is 15 minutes (see settings.py), so without this, any session older
// than 15 min starts failing every authenticated request silently.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return null;

  try {
    const { data } = await axios.post(`${API_BASE_URL}/login/refresh/`, {
      refresh: refreshToken,
    });
    localStorage.setItem("accessToken", data.access);
    if (data.refresh) {
      localStorage.setItem("refreshToken", data.refresh);
    }
    return data.access as string;
  } catch {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    return null;
  }
}

API.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & {
      _retry?: boolean;
    };

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newAccessToken = await refreshPromise;
      if (newAccessToken && originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return API(originalRequest);
      }
    }

    return Promise.reject(error);
  },
);
