const { Admin, Teacher, Student } = require('../db/models');

class AdminController {
  // Пригласить учителя (создать)
  static async inviteTeacher(req, res) {
    try {
      const { name, email, phone, password } = req.body;
      const teacher = await Teacher.create({
        name,
        email,
        phone,
        password,
        adminId: req.admin.id,
      });
      res.status(201).json({ status: 'success', data: teacher });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }

  // Пригласить ученика (создать)
  static async inviteStudent(req, res) {
    try {
      const { name, email, phone, password } = req.body;
      const student = await Student.create({
        name,
        email,
        phone,
        password,
        adminId: req.admin.id,
      });
      res.status(201).json({ status: 'success', data: student });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }

  // Привязать существующего учителя к админу
  static async assignTeacher(req, res) {
    try {
      const { teacherId } = req.body;
      const teacher = await Teacher.findByPk(teacherId);
      if (!teacher) {
        return res.status(404).json({ status: 'error', message: 'Teacher not found' });
      }
      teacher.adminId = req.admin.id;
      await teacher.save();
      res.json({ status: 'success', data: teacher });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }

  // Привязать существующего ученика к админу
  static async assignStudent(req, res) {
    try {
      const { studentId } = req.body;
      const student = await Student.findByPk(studentId);
      if (!student) {
        return res.status(404).json({ status: 'error', message: 'Student not found' });
      }
      student.adminId = req.admin.id;
      await student.save();
      res.json({ status: 'success', data: student });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }

  // Список всех учителей админа
  static async getTeachers(req, res) {
    try {
      const teachers = await Teacher.findAll({
        where: { adminId: req.admin.id },
      });
      res.json({ status: 'success', data: teachers });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }

  // Список всех учеников админа
  static async getStudents(req, res) {
    try {
      const students = await Student.findAll({
        where: { adminId: req.admin.id },
      });
      res.json({ status: 'success', data: students });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }

  // Удалить учителя
  static async removeTeacher(req, res) {
    try {
      const { teacherId } = req.params;
      const teacher = await Teacher.findOne({
        where: { id: teacherId, adminId: req.admin.id },
      });
      if (!teacher) {
        return res.status(404).json({ status: 'error', message: 'Teacher not found' });
      }
      await teacher.destroy();
      res.json({ status: 'success', message: 'Teacher removed' });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }

  // Удалить ученика
  static async removeStudent(req, res) {
    try {
      const { studentId } = req.params;
      const student = await Student.findOne({
        where: { id: studentId, adminId: req.admin.id },
      });
      if (!student) {
        return res.status(404).json({ status: 'error', message: 'Student not found' });
      }
      await student.destroy();
      res.json({ status: 'success', message: 'Student removed' });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }
}

module.exports = AdminController;
