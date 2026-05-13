const router = require('express').Router();
const authRouter = require('./authRoute');
const adminRouter = require('./adminRoute');
const teacherRouter = require('./teacherRoute');
const studentRouter = require('./studentRoute');
const messageRouter = require('./messageRoute');

router.use('/auth', authRouter);
router.use('/admins', adminRouter);
router.use('/teachers', teacherRouter);
router.use('/students', studentRouter);
router.use('/messenger', messageRouter);

module.exports = router;
