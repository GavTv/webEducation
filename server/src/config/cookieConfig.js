const WEEK_MS = 1000 * 60 * 60 * 24 * 7;
const NINETY_DAYS_MS = 1000 * 60 * 60 * 24 * 90;

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

/** Базовые флаги cookie: в проде — HTTPS и cross-origin (клиент на другом домене). */
function getRefreshCookieBase() {
  const prod = isProduction();
  return {
    httpOnly: true,
    path: '/',
    sameSite: prod ? 'none' : 'lax',
    secure: prod,
    /** Safari / cross-origin: клиентский домен → API на Render */
    ...(prod ? { partitioned: true } : {}),
  };
}

/**
 * Параметры httpOnly-cookie для refresh-токена (maxAge совпадает с TTL JWT).
 * @param {boolean} rememberMe
 */
function getRefreshCookieConfig(rememberMe) {
  return {
    ...getRefreshCookieBase(),
    maxAge: rememberMe ? NINETY_DAYS_MS : WEEK_MS,
  };
}

const clearRefreshCookie = {
  ...getRefreshCookieBase(),
  maxAge: 0,
};

module.exports = { getRefreshCookieConfig, clearRefreshCookie };
