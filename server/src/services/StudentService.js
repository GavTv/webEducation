const getMyTasks = async (studentId) => {
  return [];
};

const submitAnswer = async (studentId, taskId, answer) => {
  return { studentId, taskId, answer, status: 'submitted' };
};

const getMyProgress = async (studentId) => {
  return { completedTasks: 0, totalTasks: 0, averageGrade: 0 };
};

module.exports = {
  getMyTasks,
  submitAnswer,
  getMyProgress,
};
