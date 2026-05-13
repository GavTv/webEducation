const studentService = require('../services/StudentService');

const getMyTasks = async (req, res) => {
  try {
    const studentId = req.student.id;
    const tasks = await studentService.getMyTasks(studentId);
    res.json({ status: 200, data: tasks });
  } catch (error) {
    res.status(500).json({ status: 500, error: error.message });
  }
};

const submitAnswer = async (req, res) => {
  try {
    const studentId = req.student.id;
    const { taskId } = req.params;
    const { answer } = req.body;
    const result = await studentService.submitAnswer(studentId, taskId, answer);
    res.status(201).json({ status: 201, data: result });
  } catch (error) {
    res.status(500).json({ status: 500, error: error.message });
  }
};

const getMyProgress = async (req, res) => {
  try {
    const studentId = req.student.id;
    const progress = await studentService.getMyProgress(studentId);
    res.json({ status: 200, data: progress });
  } catch (error) {
    res.status(500).json({ status: 500, error: error.message });
  }
};

module.exports = {
  getMyTasks,
  submitAnswer,
  getMyProgress,
};
