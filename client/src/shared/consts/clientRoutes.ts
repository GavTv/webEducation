/**
 * Пути клиента.
 */
export const clientRoutes = {
  home: "/",
  forgotPassword: "/forgot-password",
  /** После OAuth (Google/GitHub): обмен access_token на сессию приложения */
  oauthBridge: "/auth/oauth-bridge",
  classes: "/classes",
  chat: "/chat",
  profile: "/profile",
} as const;

export type ClientRouteKey = keyof typeof clientRoutes;
