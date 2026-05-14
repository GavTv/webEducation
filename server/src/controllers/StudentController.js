const { Student } = require('../db/models');

class StudentController {
  // Профиль ученика
  static async getProfile(req, res) {
    try {
      const student = await Student.findByPk(req.student.id);
      res.json({ status: 'success', data: student });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }

  // Обновить профиль
  static async updateProfile(req, res) {
    try {
      const { name, phone, avatar } = req.body;
      const student = await Student.findByPk(req.student.id);
      await student.update({ name, phone, avatar });
      res.json({ status: 'success', data: student });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }

  // Мои ответы
  static async getMyAnswers(req, res) {
    try {
      // Заглушка — позже добавим модель Answer
      res.json({ status: 'success', data: [], message: 'Answers coming soon' });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }

  // Отправить ответ на задание
  static async submitAnswer(req, res) {
    try {
      // Заглушка — позже добавим модель Answer
      res.status(201).json({ status: 'success', message: 'Answer submission coming soon' });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }



  // Список доступных групп/комнат
  static async getAvailableRooms(req, res) {
    try {
      // Заглушка — позже добавим модель Room
      res.json({ status: 'success', data: [], message: 'Rooms coming soon' });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }
}

module.exports = StudentController;
