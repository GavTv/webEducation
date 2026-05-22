import type { ServerResponseType } from "@/shared/types";
import type { UserWithTokenType } from "@/entities/user/model";

const ACCESS_TOKEN_STORAGE_KEY = "webEducation:accessToken";

let accessToken = "";
let authBootstrapDone = false;
let refreshInflight: Promise<ServerResponseType<UserWithTokenType> | null> | null =
  null;

const PUBLIC_AUTH_PATHS = [
  "auth/register",
  "auth/login",
  "auth/oauth",
  "auth/google",
  "auth/check-email",
  "auth/check-username",
  "auth/forgot-password",
  "auth/verify-reset-code",
  "auth/reset-password",
] as const;

export function isPublicAuthPath(url?: string) {
  if (!url) return false;
  const path = url.replace(/^\//, "");
  return PUBLIC_AUTH_PATHS.some((p) => path === p || path.startsWith(`${p}?`));
}

export function setAccessToken(newToken: string) {
  accessToken = newToken;

  if (typeof window === "undefined") return;

  if (newToken) {
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, newToken);
  } else {
    sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  }
}

export function getAccessToken() {
  return accessToken;
}

export function hydrateAccessTokenFromSessionStorage() {
  if (typeof window === "undefined") return;

  const saved = sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  if (saved) {
    accessToken = saved;
  }
}

export function setAuthBootstrapDone(value = true) {
  authBootstrapDone = value;
}

export function isAuthBootstrapDone() {
  return authBootstrapDone;
}

export function waitForRefreshInflight() {
  return refreshInflight ?? Promise.resolve(null);
}

type RefreshRequest = () => Promise<ServerResponseType<UserWithTokenType> | null>;

let refreshRequestFn: RefreshRequest | null = null;

/** Регистрируется из axiosInstance (избегаем циклического import). */
export function registerRefreshRequest(fn: RefreshRequest) {
  refreshRequestFn = fn;
}

/** Один refresh на все параллельные вызовы (старт приложения, interceptor). */
export function refreshSession(): Promise<ServerResponseType<UserWithTokenType> | null> {
  if (!refreshRequestFn) {
    return Promise.resolve(null);
  }

  if (!refreshInflight) {
    refreshInflight = refreshRequestFn()
      .then((data) => {
        if (data?.statusCode === 200 && data.data?.accessToken) {
          setAccessToken(data.data.accessToken);
        } else {
          setAccessToken("");
        }
        return data;
      })
      .catch(() => {
        setAccessToken("");
        return null;
      })
      .finally(() => {
        refreshInflight = null;
      });
  }

  return refreshInflight;
}
