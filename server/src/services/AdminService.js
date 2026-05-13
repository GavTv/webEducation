const { Teacher, Student } = require('../db/models');

class AdminService {
  static async getTeacherStats(adminId) {
    const count = await Teacher.count({ where: { adminId } });
    return { teachers: count };
  }

  static async getStudentStats(adminId) {
    const count = await Student.count({ where: { adminId } });
    return { students: count };
  }

  static async getFullStats(adminId) {
    const teachers = await Teacher.count({ where: { adminId } });
    const students = await Student.count({ where: { adminId } });
    return { teachers, students };
  }
}

module.exports = AdminService;
