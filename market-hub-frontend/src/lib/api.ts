import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import type { ApiErrorBody } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<string | null> | null = null;

function getAccessToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("mh_access");
}

function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("mh_refresh");
}

export function setTokens(access: string, refresh?: string) {
  localStorage.setItem("mh_access", access);
  if (refresh) localStorage.setItem("mh_refresh", refresh);
}

export function clearTokens() {
  localStorage.removeItem("mh_access");
  localStorage.removeItem("mh_refresh");
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  try {
    const { data } = await axios.post(`${API_URL}/auth/token/refresh/`, {
      refresh,
    });
    const access = data.access as string;
    setTokens(access, data.refresh ?? refresh);
    return access;
  } catch {
    clearTokens();
    return null;
  }
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const original = error.config as RetryConfig | undefined;
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !original.url?.includes("/auth/login/") &&
      !original.url?.includes("/auth/token/refresh/")
    ) {
      original._retry = true;
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      const access = await refreshPromise;
      if (access) {
        original.headers.Authorization = `Bearer ${access}`;
        return api(original);
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("mh:logout"));
      }
    }
    return Promise.reject(error);
  },
);

export function getErrorMessage(error: unknown, fallback = "Something went wrong") {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : fallback;
  }
  const data = error.response?.data as ApiErrorBody | undefined;
  const detail = data?.error?.detail ?? data?.detail;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object") {
    const first = Object.values(detail as Record<string, unknown>)[0];
    if (Array.isArray(first) && typeof first[0] === "string") return first[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && "detail" in (first as object)) {
      return String((first as { detail: string }).detail);
    }
  }
  return fallback;
}
