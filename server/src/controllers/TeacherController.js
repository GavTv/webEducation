const teacherService = require('../services/TeacherService');

const getGroups = async (req, res) => {
  try {
    const teacherId = req.teacher.id;
    const groups = await teacherService.getGroups(teacherId);
    res.json({ status: 200, data: groups });
  } catch (error) {
    res.status(500).json({ status: 500, error: error.message });
  }
};

const createGroup = async (req, res) => {
  try {
    const teacherId = req.teacher.id;
    const { name } = req.body;
    const group = await teacherService.createGroup(teacherId, name);
    res.status(201).json({ status: 201, data: group });
  } catch (error) {
    res.status(500).json({ status: 500, error: error.message });
  }
};

const addStudentToGroup = async (req, res) => {
  try {
    const { groupId, studentId } = req.params;
    const result = await teacherService.addStudentToGroup(groupId, studentId);
    res.json({ status: 200, data: result });
  } catch (error) {
    res.status(500).json({ status: 500, error: error.message });
  }
};

const createTask = async (req, res) => {
  try {
    const teacherId = req.teacher.id;
    const { title, description, groupId, dueDate } = req.body;
    const task = await teacherService.createTask(teacherId, title, description, groupId, dueDate);
    res.status(201).json({ status: 201, data: task });
  } catch (error) {
    res.status(500).json({ status: 500, error: error.message });
  }
};

const getTasks = async (req, res) => {
  try {
    const teacherId = req.teacher.id;
    const tasks = await teacherService.getTasks(teacherId);
    res.json({ status: 200, data: tasks });
  } catch (error) {
    res.status(500).json({ status: 500, error: error.message });
  }
};

const gradeTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { studentId, grade, feedback } = req.body;
    const result = await teacherService.gradeTask(taskId, studentId, grade, feedback);
    res.json({ status: 200, data: result });
  } catch (error) {
    res.status(500).json({ status: 500, error: error.message });
  }
};

module.exports = {
  getGroups,
  createGroup,
  addStudentToGroup,
  createTask,
  getTasks,
  gradeTask,
};
