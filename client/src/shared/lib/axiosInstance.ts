import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";

/** Origin без хвостовых слэшей и без суффикса `/api`, чтобы не получить `/api/api/`. */
function getApiBaseUrl() {
  let raw = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000").trim();
  raw = raw.replace(/\/+$/, "");
  raw = raw.replace(/\/api$/i, "");
  return `${raw}/api/`;
}

export const axiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
});

let accessToken = "";
let authBootstrapComplete = false;
let refreshInflight: Promise<unknown> | null = null;

export function setAccessToken(newToken: string) {
  accessToken = newToken;
}

export function getAccessToken() {
  return accessToken;
}

/** После первой проверки сессии (refresh при старте) — можно редиректить на логин. */
export function setAuthBootstrapComplete(value = true) {
  authBootstrapComplete = value;
}

function isAuthBootstrapComplete() {
  return authBootstrapComplete;
}

/** Один запрос refresh на все параллельные вызовы (старт + interceptor). */
export function refreshSession<T = unknown>(): Promise<T | null> {
  if (!refreshInflight) {
    refreshInflight = axiosInstance
      .get("auth/refresh")
      .then(({ data }) => {
        const payload = data as { data?: { accessToken?: string } };
        setAccessToken(payload.data?.accessToken ?? "");
        return data as T;
      })
      .catch(() => {
        setAccessToken("");
        return null;
      })
      .finally(() => {
        refreshInflight = null;
      });
  }

  return refreshInflight as Promise<T | null>;
}

export async function refreshSessionAccessToken(): Promise<string> {
  const data = await refreshSession<{ data?: { accessToken?: string } }>();
  return data?.data?.accessToken ?? "";
}

function hasAuthHeader(config: InternalAxiosRequestConfig) {
  const h = config.headers?.Authorization;
  return typeof h === "string" && h.length > 0;
}

axiosInstance.interceptors.request.use((config) => {
  if (accessToken && !hasAuthHeader(config)) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const previousRequest = error.config;

    const shouldTryRefresh =
      error.response?.status === 403 &&
      previousRequest &&
      hasAuthHeader(previousRequest) &&
      !previousRequest.sent;

    if (shouldTryRefresh) {
      previousRequest.sent = true;
      const newToken = await refreshSessionAccessToken();

      if (newToken) {
        previousRequest.headers.Authorization = `Bearer ${newToken}`;
        return axiosInstance(previousRequest);
      }

      if (
        isAuthBootstrapComplete() &&
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/auth")
      ) {
        window.location.href = "/auth?mode=login";
      }

      return Promise.reject(error);
    }
    return Promise.reject(error);
  },
);
