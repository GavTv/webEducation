const router = require('express').Router();
const {
  getGroups,
  createGroup,
  addStudentToGroup,
  createTask,
  getTasks,
  gradeTask,
} = require('../controllers/TeacherController');

router.get('/groups', getGroups);
router.post('/groups', createGroup);
router.post('/groups/:groupId/students/:studentId', addStudentToGroup);
router.post('/tasks', createTask);
router.get('/tasks', getTasks);
router.post('/tasks/:taskId/grade', gradeTask);

module.exports = router;
