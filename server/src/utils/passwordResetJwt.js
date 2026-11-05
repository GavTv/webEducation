const path = require('path');
require('./loadEnv')();
const jwt = require('jsonwebtoken');

const RESET_TYP = 'pwd-reset';

function getSecret() {
  return (
    process.env.PASSWORD_RESET_JWT_SECRET || process.env.ACCESS_TOKEN_SECRET
  );
}

/**
 * @param {number} userId
 * @returns {string}
 */
function signPasswordResetToken(userId) {
  return jwt.sign(
    { typ: RESET_TYP, sub: String(userId) },
    getSecret(),
    { expiresIn: '15m' },
  );
}

/**
 * @param {string} token
 * @returns {number} userId
 */
function verifyPasswordResetToken(token) {
  const payload = jwt.verify(token, getSecret());
  if (payload.typ !== RESET_TYP || payload.sub == null) {
    throw new Error('INVALID_RESET_TOKEN');
  }
  const uid = Number(payload.sub);
  if (!Number.isFinite(uid)) {
    throw new Error('INVALID_RESET_TOKEN');
  }
  return uid;
}

module.exports = {
  signPasswordResetToken,
  verifyPasswordResetToken,
};
