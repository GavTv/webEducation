/**
 * Пути клиента.
 */
export const clientRoutes = {
  home: "/",
  auth: "/auth",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  /** После OAuth (Google/GitHub): обмен access_token на сессию приложения */
  oauthBridge: "/auth/oauth-bridge",
  classes: "/classes",
  chat: "/chat",
  profile: "/profile",
  admin: "/admin",
} as const;

export type ClientRouteKey = keyof typeof clientRoutes;

export type AuthModeParam = "login" | "register";

/** Вход / регистрация: `/auth?mode=login` или `/auth?mode=register` */
export function authPath(mode: AuthModeParam = "login"): string {
  return `${clientRoutes.auth}?mode=${mode}`;
}
