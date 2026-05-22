const router = require('express').Router();
const verifyAccessToken = require('../middleware/verifyAccessToken');
const AiController = require('../controllers/AiController');

router.post('/chat', verifyAccessToken, AiController.chat);

module.exports = router;
