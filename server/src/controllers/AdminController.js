const adminService = require('../services/AdminService');

const getAllUsers = async (req, res) => {
  try {
    const users = await adminService.getAllUsers();
    res.json({ status: 200, data: users });
  } catch (error) {
    res.status(500).json({ status: 500, error: error.message });
  }
};

const inviteTeacher = async (req, res) => {
  try {
    const { email, name } = req.body;
    const teacher = await adminService.inviteTeacher(email, name);
    res.status(201).json({ status: 201, data: teacher });
  } catch (error) {
    res.status(500).json({ status: 500, error: error.message });
  }
};

const inviteStudent = async (req, res) => {
  try {
    const { email, name } = req.body;
    const student = await adminService.inviteStudent(email, name);
    res.status(201).json({ status: 201, data: student });
  } catch (error) {
    res.status(500).json({ status: 500, error: error.message });
  }
};

const bindTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const adminId = req.admin.id;
    const teacher = await adminService.bindTeacher(adminId, teacherId);
    res.json({ status: 200, data: teacher });
  } catch (error) {
    res.status(500).json({ status: 500, error: error.message });
  }
};

const bindStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const adminId = req.admin.id;
    const student = await adminService.bindStudent(adminId, studentId);
    res.json({ status: 200, data: student });
  } catch (error) {
    res.status(500).json({ status: 500, error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    await adminService.deleteUser(userId);
    res.json({ status: 200, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ status: 500, error: error.message });
  }
};

module.exports = {
  getAllUsers,
  inviteTeacher,
  inviteStudent,
  bindTeacher,
  bindStudent,
  deleteUser,
};
