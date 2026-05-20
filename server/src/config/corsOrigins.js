/** Origins для Express CORS и Socket.IO (из CORS_ORIGINS или localhost в dev). */
function getCorsOrigins() {
  const fromEnv = process.env.CORS_ORIGINS;
  if (fromEnv && typeof fromEnv === 'string') {
    const list = fromEnv
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    if (list.length > 0) return list;
  }
  return ['http://localhost:5173', 'http://127.0.0.1:5173'];
}

module.exports = { getCorsOrigins };
