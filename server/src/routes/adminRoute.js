const router = require('express').Router();
const {
  getAllUsers,
  inviteTeacher,
  inviteStudent,
  bindTeacher,
  bindStudent,
  deleteUser,
} = require('../controllers/AdminController');

router.get('/users', getAllUsers);
router.post('/invite/teacher', inviteTeacher);
router.post('/invite/student', inviteStudent);
router.post('/bind/teacher/:teacherId', bindTeacher);
router.post('/bind/student/:studentId', bindStudent);
router.delete('/users/:userId', deleteUser);

module.exports = router;
