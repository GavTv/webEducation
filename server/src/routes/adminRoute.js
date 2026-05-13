const router = require('express').Router();
const AdminController = require('../controllers/AdminController');

// Приглашения
router.post('/teachers/invite', AdminController.inviteTeacher);
router.post('/students/invite', AdminController.inviteStudent);

// Привязка существующих
router.post('/teachers/assign', AdminController.assignTeacher);
router.post('/students/assign', AdminController.assignStudent);

// Списки
router.get('/teachers', AdminController.getTeachers);
router.get('/students', AdminController.getStudents);

// Удаление
router.delete('/teachers/:teacherId', AdminController.removeTeacher);
router.delete('/students/:studentId', AdminController.removeStudent);

module.exports = router;
