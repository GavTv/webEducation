const router = require('express').Router();
const authRouter = require('./authRoute');
const userManagementRouter = require('./userManagementRoute');
const classRouter = require('./classRoute');

router.use('/auth', authRouter);
router.use('/admin', userManagementRouter);
router.use('/classes', classRouter);

module.exports = router;
