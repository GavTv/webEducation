const router = require('express').Router();
const adminRouter = require('./adminRoute');
const teacherRouter = require('./teacherRoute');
const studentRouter = require('./studentRoute');

router.use('/admins', adminRouter);
router.use('/teachers', teacherRouter);
router.use('/students', studentRouter);

module.exports = router;
