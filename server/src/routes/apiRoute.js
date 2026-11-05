const router = require('express').Router();
const authRouter = require('./authRoute');
const userManagementRouter = require('./userManagementRoute');
const classRouter = require('./classRoute');
const aiRouter = require('./aiRoute');
const AvatarController = require('../controllers/AvatarController');

router.use('/auth', authRouter);
router.use('/admin', userManagementRouter);
router.use('/classes', classRouter);
router.use('/ai', aiRouter);
router.get('/avatars/:userId', AvatarController.getAvatar);

module.exports = router;
