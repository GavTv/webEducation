const router = require('express').Router();
const MessageController = require('../controllers/MessageController');

// Групповые чаты
router.get('/groups', MessageController.listGroups);
router.post('/groups', MessageController.createGroup);
router.get('/groups/:groupId/messages', MessageController.listGroupMessages);
router.post('/groups/:groupId/messages', MessageController.sendGroupMessage);

module.exports = router;
