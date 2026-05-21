const router = require('express').Router();
const ClassController = require('../controllers/ClassController');
const verifyAccessToken = require('../middleware/verifyAccessToken');
const requireTeacherOrAdmin = require('../middleware/requireTeacherOrAdmin');

router.get('/', verifyAccessToken, ClassController.list);

router.get(
  '/:groupId/channels',
  verifyAccessToken,
  ClassController.listChannels,
);

router.post(
  '/:groupId/channels',
  verifyAccessToken,
  requireTeacherOrAdmin,
  ClassController.createChannel,
);

router.delete(
  '/:groupId/channels/:channelId',
  verifyAccessToken,
  requireTeacherOrAdmin,
  ClassController.removeChannel,
);

router.get('/:id/access', verifyAccessToken, ClassController.getAccess);

router.post('/:id/join', verifyAccessToken, ClassController.join);

router.post('/', verifyAccessToken, requireTeacherOrAdmin, ClassController.create);

router.patch(
  '/:id',
  verifyAccessToken,
  requireTeacherOrAdmin,
  ClassController.update,
);

router.patch(
  '/:id/password',
  verifyAccessToken,
  requireTeacherOrAdmin,
  ClassController.setPassword,
);

router.delete(
  '/:id',
  verifyAccessToken,
  requireTeacherOrAdmin,
  ClassController.remove,
);

module.exports = router;
