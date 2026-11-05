const formatResponse = require('../utils/formatResponse');

function canManageClasses(role) {
  return role === 'teacher' || role === 'admin';
}

function requireTeacherOrAdmin(req, res, next) {
  const user = res.locals.user;
  if (!user || !canManageClasses(user.role)) {
    return res
      .status(403)
      .json(
        formatResponse(
          403,
          'Создавать и редактировать классы могут только учителя и администраторы',
        ),
      );
  }
  next();
}

module.exports = requireTeacherOrAdmin;
module.exports.canManageClasses = canManageClasses;
