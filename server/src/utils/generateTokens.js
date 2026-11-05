require('./loadEnv')();
const jwt = require('jsonwebtoken');
const JWTconfig = require('../config/JWTconfig');

/**
 * @param {{ user: object }} payload
 * @param {{ rememberMe?: boolean }} [options]
 */
function generateTokens(payload, options = {}) {
  const rememberMe = Boolean(options.rememberMe);
  const refreshPayload = { user: payload.user, remember: rememberMe };
  const refreshOpts = rememberMe
    ? JWTconfig.refreshTokenRemember
    : JWTconfig.refreshTokenSession;

  return {
    accessToken: jwt.sign(
      { user: payload.user },
      process.env.ACCESS_TOKEN_SECRET,
      JWTconfig.accessToken,
    ),
    refreshToken: jwt.sign(
      refreshPayload,
      process.env.REFRESH_TOKEN_SECRET,
      refreshOpts,
    ),
  };
}

module.exports = generateTokens;
