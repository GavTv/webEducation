const jwt = require('jsonwebtoken');
const formatResponse = require('../utils/formatResponse');
require('../utils/loadEnv')();

function verifyAccessToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const accessToken =
      typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : authHeader?.split(' ')?.[1];

    if (!accessToken) {
      return res
        .status(403)
        .json(formatResponse(403, 'Невалидный accessToken'));
    }

    const { user } = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

    if (!user) {
      return res
        .status(403)
        .json(formatResponse(403, 'Невалидный accessToken'));
    }

    res.locals.user = user;

    next();
  } catch (error) {
    return res.status(403).json(formatResponse(403, 'Невалидный accessToken'));
  }
}

module.exports = verifyAccessToken;