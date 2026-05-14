const router = require('express').Router();
const StudentController = require('../controllers/StudentController');

// Профиль
router.get('/profile', StudentController.getProfile);
router.put('/profile', StudentController.updateProfile);

// Ответы
router.get('/answers', StudentController.getMyAnswers);
router.post('/answers', StudentController.submitAnswer);



// Комнаты
router.get('/rooms', StudentController.getAvailableRooms);

module.exports = router;
