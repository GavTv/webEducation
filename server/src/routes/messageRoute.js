const router = require('express').Router();

const MessageController = require('../controllers/MessageController');
const verifyAccessToken = require('../middleware/verifyAccessToken');

router.use(verifyAccessToken);

router
  .route('/groups')
  .get(MessageController.listGroups)
  .post(MessageController.createGroup);

router
  .route('/groups/:groupId/messages')
  .get(MessageController.listGroupMessages)
  .post(MessageController.sendGroupMessage);

module.exports = router;
