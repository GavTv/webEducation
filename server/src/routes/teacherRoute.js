const router = require('express').Router();
const TeacherController = require('../controllers/TeacherController');

// Профиль
router.get('/profile', TeacherController.getProfile);
router.put('/profile', TeacherController.updateProfile);

// Группы (комнаты)
router.get('/groups', TeacherController.getGroups);
router.post('/groups', TeacherController.createGroup);

// Задания
router.get('/assignments', TeacherController.getAssignments);
router.post('/assignments', TeacherController.createAssignment);

// Ученики в группе
router.get('/groups/:groupId/students', TeacherController.getStudents);

module.exports = router;
