const router = require('express').Router();
const {
  getMyTasks,
  submitAnswer,
  getMyProgress,
} = require('../controllers/StudentController');

router.get('/tasks', getMyTasks);
router.post('/tasks/:taskId/answer', submitAnswer);
router.get('/progress', getMyProgress);

module.exports = router;
