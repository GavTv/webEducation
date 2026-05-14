const WEEK_MS = 1000 * 60 * 60 * 24 * 7;
const NINETY_DAYS_MS = 1000 * 60 * 60 * 24 * 90;

/**
 * Параметры httpOnly-cookie для refresh-токена (maxAge совпадает с TTL JWT).
 * @param {boolean} rememberMe
 */
function getRefreshCookieConfig(rememberMe) {
  return {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    maxAge: rememberMe ? NINETY_DAYS_MS : WEEK_MS,
  };
}

const clearRefreshCookie = { path: '/', httpOnly: true, sameSite: 'lax' };

module.exports = { getRefreshCookieConfig, clearRefreshCookie };
