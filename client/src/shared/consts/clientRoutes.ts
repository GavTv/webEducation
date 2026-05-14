/**
 * Пути клиента.
 */
export const clientRoutes = {
  home: "/",
  login: "/login",
  signup: "/signup",
  classes: "/classes",
  chat: "/chat",
  profile: "/profile",
} as const;

export type ClientRouteKey = keyof typeof clientRoutes;
