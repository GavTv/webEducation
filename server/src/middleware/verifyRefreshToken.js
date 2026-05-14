const jwt = require('jsonwebtoken');
const formatResponse = require('../utils/formatResponse');
process.loadEnvFile();

function verifyRefreshToken(req, res, next) {
  try {
    const { refreshToken } = req.cookies;

    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );

    const { user, remember } = decoded;

    if (!user) {
      return res
        .status(401)
        .json(formatResponse(401, 'Невалидный refreshToken'));
    }

    res.locals.user = user;
    res.locals.rememberMe = Boolean(remember);

    next();
  } catch (error) {
    console.log('======== verifyRefreshToken =========');
    console.log(error);
    return res.status(401).json(formatResponse(401, 'Невалидный refreshToken'));
  }
}

module.exports = verifyRefreshToken;
