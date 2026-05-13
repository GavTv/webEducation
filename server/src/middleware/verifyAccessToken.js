const jwt = require('jsonwebtoken');
const formatResponse = require('../utils/formatResponse');
process.loadEnvFile();

function verifyAccessToken(req, res, next) {
  try {
    const accessToken = req.headers.authorization.split(' ')[1];

    const { user } = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

    if (!user) {
      return res
        .status(403)
        .json(formatResponse(403, 'Невалидный accessToken'));
    }

    res.locals.user = user;

    next();
  } catch (error) {
    console.log('======== verifyAccessToken =========');
    console.log(error);
    return res.status(403).json(formatResponse(403, 'Невалидный accessToken'));
  }
}

module.exports = verifyAccessToken;