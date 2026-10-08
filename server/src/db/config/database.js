'use strict';

/** SSL нужен внешним хостам (Neon, Supabase, Render external). Внутренний хост Render его не принимает. */
function needsSsl(connectionString) {
  const url = String(connectionString || '');
  if (!url) return false;
  if (/sslmode=disable/i.test(url)) return false;

  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    return /sslmode=require/i.test(url);
  }

  if (host === 'localhost' || host === '127.0.0.1') return false;
  if (host.startsWith('dpg-') && !host.includes('.')) return false;
  return true;
}

function pgConfig(envVar) {
  const config = {
    use_env_variable: envVar,
    dialect: 'postgres',
  };

  if (needsSsl(process.env[envVar])) {
    config.dialectOptions = {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    };
  }

  return config;
}

module.exports = {
  development: pgConfig('DB'),
  test: pgConfig('DB_TEST'),
  production: pgConfig('DB_PROD'),
};
