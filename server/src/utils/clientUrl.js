require('./loadEnv')();

/**
 * Базовый URL фронта (без завершающего слэша).
 * CLIENT_URL — предпочтительно на сервере; иначе AUTH_URL / NEXTAUTH_URL с клиента.
 */
function getClientBaseUrl() {
  const candidates = [
    process.env.CLIENT_URL,
    process.env.FRONTEND_URL,
    process.env.AUTH_URL,
    process.env.NEXTAUTH_URL,
  ];
  for (const raw of candidates) {
    if (typeof raw === 'string' && raw.trim()) {
      return raw.trim().replace(/\/+$/, '');
    }
  }
  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:5173';
  }
  return null;
}

/**
 * @param {string} resetToken JWT сброса пароля
 * @returns {string | null}
 */
function buildResetPasswordUrl(resetToken) {
  const base = getClientBaseUrl();
  if (!base || !resetToken) return null;
  const q = new URLSearchParams({ token: resetToken });
  return `${base}/reset-password?${q.toString()}`;
}

module.exports = {
  getClientBaseUrl,
  buildResetPasswordUrl,
};
