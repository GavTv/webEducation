const router = require('express').Router();
const adminRouter = require('./adminRoute');
const teacherRouter = require('./teacherRoute');
const studentRouter = require('./studentRoute');
const messengerRouter = require('./messageRoute');

router.use('/admins', adminRouter);
router.use('/teachers', teacherRouter);
router.use('/students', studentRouter);
router.use('/messenger', messengerRouter);

module.exports = router;
