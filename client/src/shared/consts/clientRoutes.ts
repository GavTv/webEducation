/**
 * Пути клиента (как у преподавателя — отдельный файл констант).
 * Дополняй по мере появления страниц в src/app/...
 */
export const clientRoutes = {
  home: "/",
} as const;

export type ClientRouteKey = keyof typeof clientRoutes;
