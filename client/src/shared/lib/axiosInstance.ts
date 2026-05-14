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

export function setAccessToken(newToken: string) {
  accessToken = newToken;
}

export function getAccessToken() {
  return accessToken;
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
      try {
        const { data } = await axiosInstance.get("auth/refresh");
        const newToken = data.data?.accessToken ?? "";
        setAccessToken(newToken);
        previousRequest.headers.Authorization = `Bearer ${newToken}`;
        return axiosInstance(previousRequest);
      } catch {
        setAccessToken("");
        if (
          typeof window !== "undefined" &&
          window.location.pathname !== "/"
        ) {
          window.location.href = "/";
        }
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  },
);
