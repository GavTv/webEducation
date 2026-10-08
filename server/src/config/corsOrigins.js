const SITE_ORIGINS = [
  'https://my-workchat.ru',
  'https://www.my-workchat.ru',
];

/** Origins для Express CORS и Socket.IO. Сайт всегда разрешён, плюс CORS_ORIGINS и localhost. */
function getCorsOrigins() {
  const fromEnv = process.env.CORS_ORIGINS;
  const extra =
    fromEnv && typeof fromEnv === 'string'
      ? fromEnv
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean)
      : ['http://localhost:5173', 'http://127.0.0.1:5173'];

  return [...new Set([...SITE_ORIGINS, ...extra])];
}

module.exports = { getCorsOrigins };
