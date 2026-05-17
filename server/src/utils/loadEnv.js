const fs = require('fs');
const path = require('path');

/** Локально читает server/.env; на Render переменные уже в process.env. */
function loadEnv() {
  const envPath = path.join(__dirname, '../../.env');
  if (!fs.existsSync(envPath)) {
    return;
  }
  try {
    process.loadEnvFile(envPath);
  } catch {
    // ignore invalid .env
  }
}

module.exports = loadEnv;
