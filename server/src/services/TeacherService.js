const getGroups = async (teacherId) => {
  return [];
};

const createGroup = async (teacherId, name) => {
  return { id: 1, name, teacherId };
};

const addStudentToGroup = async (groupId, studentId) => {
  return { groupId, studentId };
};

const createTask = async (teacherId, title, description, groupId, dueDate) => {
  return { id: 1, title, description, groupId, dueDate, teacherId };
};

const getTasks = async (teacherId) => {
  return [];
};

const gradeTask = async (taskId, studentId, grade, feedback) => {
  return { taskId, studentId, grade, feedback };
};

module.exports = {
  getGroups,
  createGroup,
  addStudentToGroup,
  createTask,
  getTasks,
  gradeTask,
};
