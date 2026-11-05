const router = require('express').Router();
const UserAdminController = require('../controllers/UserAdminController');
const verifyAccessToken = require('../middleware/verifyAccessToken');
const requireAdmin = require('../middleware/requireAdmin');

router.get(
  '/users',
  verifyAccessToken,
  requireAdmin,
  UserAdminController.listUsers,
);

router.patch(
  '/users/:id/role',
  verifyAccessToken,
  requireAdmin,
  UserAdminController.updateUserRole,
);

router.delete(
  '/users/:id',
  verifyAccessToken,
  requireAdmin,
  UserAdminController.deleteUser,
);

module.exports = router;
