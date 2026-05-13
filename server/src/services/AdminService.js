const { Admin, Teacher, Student } = require('../db/models');

const getAllUsers = async () => {
  const teachers = await Teacher.findAll();
  const students = await Student.findAll();
  const admins = await Admin.findAll();
  return { admins, teachers, students };
};

const inviteTeacher = async (email, name) => {
  const teacher = await Teacher.create({ email, name, password: 'temp123' });
  return teacher;
};

const inviteStudent = async (email, name) => {
  const student = await Student.create({ email, name, password: 'temp123' });
  return student;
};

const bindTeacher = async (adminId, teacherId) => {
  const teacher = await Teacher.findByPk(teacherId);
  await teacher.update({ adminId });
  return teacher;
};

const bindStudent = async (adminId, studentId) => {
  const student = await Student.findByPk(studentId);
  await student.update({ adminId });
  return student;
};

const deleteUser = async (userId) => {
  const teacher = await Teacher.findByPk(userId);
  if (teacher) {
    await teacher.destroy();
    return;
  }
  const student = await Student.findByPk(userId);
  if (student) {
    await student.destroy();
    return;
  }
  throw new Error('User not found');
};

module.exports = {
  getAllUsers,
  inviteTeacher,
  inviteStudent,
  bindTeacher,
  bindStudent,
  deleteUser,
};
