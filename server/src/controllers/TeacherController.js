const { Teacher } = require('../db/models');

class TeacherController {
  // Профиль учителя
  static async getProfile(req, res) {
    try {
      const teacher = await Teacher.findByPk(req.teacher.id);
      res.json({ status: 'success', data: teacher });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }

  // Обновить профиль
  static async updateProfile(req, res) {
    try {
      const { name, phone, avatar } = req.body;
      const teacher = await Teacher.findByPk(req.teacher.id);
      await teacher.update({ name, phone, avatar });
      res.json({ status: 'success', data: teacher });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }

  // Группы (комнаты) учителя
  static async getGroups(req, res) {
    try {
      // Заглушка — позже добавим модель Room
      res.json({ status: 'success', data: [], message: 'Groups coming soon' });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }

  // Создать группу (комнату)
  static async createGroup(req, res) {
    try {
      // Заглушка — позже добавим модель Room
      res.status(201).json({ status: 'success', message: 'Group creation coming soon' });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }

  // Задания к уроку
  static async getAssignments(req, res) {
    try {
      // Заглушка — позже добавим модель Assignment
      res.json({ status: 'success', data: [], message: 'Assignments coming soon' });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }

  // Создать задание
  static async createAssignment(req, res) {
    try {
      // Заглушка — позже добавим модель Assignment
      res.status(201).json({ status: 'success', message: 'Assignment creation coming soon' });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }

  // Список учеников в группе
  static async getStudents(req, res) {
    try {
      const { groupId } = req.params;
      // Заглушка — позже добавим связь Room-Student
      res.json({ status: 'success', data: [], message: 'Students list coming soon' });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }
}

module.exports = TeacherController;
