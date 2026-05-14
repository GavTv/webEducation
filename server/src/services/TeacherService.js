const { Teacher } = require('../db/models');

class TeacherService {
  static async getById(teacherId) {
    return Teacher.findByPk(teacherId);
  }

  static async updateProfile(teacherId, data) {
    const teacher = await Teacher.findByPk(teacherId);
    return teacher.update(data);
  }
}

module.exports = TeacherService;
