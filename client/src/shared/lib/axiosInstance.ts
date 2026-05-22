import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import type { ServerResponseType } from "@/shared/types";
import type { UserWithTokenType } from "@/entities/user/model";
import {
  getAccessToken,
  hydrateAccessTokenFromSessionStorage,
  isAuthBootstrapDone,
  isPublicAuthPath,
  refreshSession,
  registerRefreshRequest,
  setAccessToken,
  setAuthBootstrapDone,
  waitForRefreshInflight,
} from "./authSession";

hydrateAccessTokenFromSessionStorage();

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

export {
  getAccessToken,
  setAccessToken,
  setAuthBootstrapDone,
  refreshSession,
};

registerRefreshRequest(async () => {
  const { data } = await axiosInstance.get<
    ServerResponseType<UserWithTokenType>
  >("auth/refresh");
  return data;
});

function hasAuthHeader(config: InternalAxiosRequestConfig) {
  const h = config.headers?.Authorization;
  return typeof h === "string" && h.length > 0;
}

axiosInstance.interceptors.request.use(async (config) => {
  const url = config.url ?? "";

  if (!url.includes("auth/refresh") && !isPublicAuthPath(url)) {
    await waitForRefreshInflight();
    if (!getAccessToken()) {
      await refreshSession();
    }
  }

  const token = getAccessToken();
  if (token && !hasAuthHeader(config)) {
    config.headers.Authorization = `Bearer ${token}`;
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
      !previousRequest.url?.includes("auth/refresh") &&
      !previousRequest.sent;

    if (shouldTryRefresh) {
      previousRequest.sent = true;
      const data = await refreshSession();
      const newToken = data?.data?.accessToken ?? "";

      if (newToken) {
        previousRequest.headers.Authorization = `Bearer ${newToken}`;
        return axiosInstance(previousRequest);
      }

      setAccessToken("");

      if (
        isAuthBootstrapDone() &&
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
