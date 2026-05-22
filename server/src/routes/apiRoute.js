const router = require('express').Router();
const authRouter = require('./authRoute');
const userManagementRouter = require('./userManagementRoute');
const classRouter = require('./classRoute');
const aiRouter = require('./aiRoute');

router.use('/auth', authRouter);
router.use('/admin', userManagementRouter);
router.use('/classes', classRouter);
router.use('/ai', aiRouter);

module.exports = router;
