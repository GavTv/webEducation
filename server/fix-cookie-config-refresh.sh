#!/bin/bash

set -e

node <<'NODE'
const fs = require('fs');

const file = 'src/controllers/AuthController.js';

if (!fs.existsSync(file)) {
  console.log('Не найден src/controllers/AuthController.js');
  process.exit(1);
}

let text = fs.readFileSync(file, 'utf8');

if (!text.includes('function getLocalRefreshCookieConfig')) {
  text = text.replace(
    `const generateTokens = require('../utils/generateTokens');`,
    `const generateTokens = require('../utils/generateTokens');

function getLocalRefreshCookieConfig() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: 1000 * 60 * 60 * 24 * 30,
  };
}`,
  );
}

text = text.replaceAll(
  `.cookie('refreshToken', refreshToken, cookieConfig)`,
  `.cookie('refreshToken', refreshToken, getLocalRefreshCookieConfig())`,
);

text = text.replaceAll(
  `.cookie("refreshToken", refreshToken, cookieConfig)`,
  `.cookie("refreshToken", refreshToken, getLocalRefreshCookieConfig())`,
);

fs.writeFileSync(file, text);

console.log('FIXED: cookieConfig заменён на getLocalRefreshCookieConfig()');
NODE
