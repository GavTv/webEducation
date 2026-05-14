const { Student } = require('../db/models');

class StudentService {
  static async getById(studentId) {
    return Student.findByPk(studentId);
  }

  static async updateProfile(studentId, data) {
    const student = await Student.findByPk(studentId);
    return student.update(data);
  }
}

module.exports = StudentService;
