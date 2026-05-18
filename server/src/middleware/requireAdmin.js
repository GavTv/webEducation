const formatResponse = require('../utils/formatResponse');

function requireAdmin(req, res, next) {
  const user = res.locals.user;
  if (!user || user.role !== 'admin') {
    return res
      .status(403)
      .json(formatResponse(403, 'Доступ только для администратора'));
  }
  next();
}

module.exports = requireAdmin;
