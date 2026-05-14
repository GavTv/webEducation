/**
 * Пути клиента.
 */
export const clientRoutes = {
  home: "/",
  classes: "/classes",
  chat: "/chat",
  profile: "/profile",
} as const;

export type ClientRouteKey = keyof typeof clientRoutes;
