const TaskService = require('../services/TaskService');
const formatResponse = require('../utils/formatResponse');

class TaskController {
  static async viewTasksPage(req, res) {
    try {
      const rawTasks = await TaskService.getAllTasks();

      const tasks = rawTasks.map((task) => task.get());

      if (rawTasks.length === 0) {
        return res.status(200).json(formatResponse(200, 'Задачи отсутствуют'));
      }

      return res.status(200).send(`
          <div style="width: 35vw; margin: 0 auto;">
            <form
        action="/api/tasks"
        method="POST"
        style="display: flex; flex-direction: column; gap: 20px"
      >
        <input type="text" name="title" placeholder="Название" />
        <input type="text" name="text" placeholder="Описание" />
        <button type="submit">Отправить</button>
      </form>
            ${tasks
              .map(
                (task) => `
              <div style="text-align: center; padding: 10px; margin: 20px 0; background-color: whitesmoke; border-radius: 10px; box-shadow: 0 2px 5px 2px rgba(0, 0, 0, 0.1)">
                <h3>${task.title}</h3>
                <p>${task.text}</p>
              </div>
              `,
              )
              .join('')
              .replace(',', '')}
          </div>
          `);
    } catch (error) {
      console.log('======== TaskController.viewTasksPage =========');
      console.log(error);
      return res
        .status(500)
        .json(formatResponse(500, 'Ошибка при получении задач'));
    }
  }

  static async getAll(req, res) {
    try {
      const tasks = await TaskService.getAllTasks();

      if (tasks.length === 0) {
        return res.status(200).json(formatResponse(200, 'Задачи отсутствуют'));
      }

      return res
        .status(200)
        .json(formatResponse(200, 'Задачи получены', tasks));
    } catch (error) {
      console.log('======== TaskController.getAll =========');
      console.log(error);
      return res
        .status(500)
        .json(formatResponse(500, 'Ошибка при получении задач'));
    }
  }

  static async getOne(req, res) {
    const { id } = req.params;

    if (Number.isNaN(Number(id))) {
      return res.status(400).json(formatResponse(400, 'Неверный формат ID'));
    }

    try {
      const task = await TaskService.getTaskById(Number(id));

      if (!task) {
        return res.status(404).json(formatResponse(404, 'Задача не найдена'));
      }

      return res.status(200).json(formatResponse(200, 'Задача получена', task));
    } catch (error) {
      console.log('======== TaskController.getOne =========');
      console.log(error);
      return res
        .status(500)
        .json(formatResponse(500, 'Ошибка при получении задачи'));
    }
  }

  static async create(req, res) {
    const { title, text } = req.body;
    const { user } = res.locals;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res
        .status(400)
        .json(formatResponse(400, 'Название задачи обязательно'));
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res
        .status(400)
        .json(formatResponse(400, 'Описание задачи обязательно'));
    }

    try {
      const newTask = await TaskService.createTask({
        title,
        text,
        user_id: user.id,
      });

      return res
        .status(201)
        .json(formatResponse(201, 'Задача создана', newTask));
    } catch (error) {
      console.log('======== TaskController.create =========');
      console.log(error);
      return res
        .status(500)
        .json(formatResponse(500, 'Ошибка при создании новой задачи'));
    }
  }

  static async update(req, res) {
    const { title, text } = req.body;
    const { id } = req.params;
    const { user } = res.locals;

    if (Number.isNaN(Number(id))) {
      return res.status(400).json(formatResponse(400, 'Неверный формат ID'));
    }

    try {
      const updatedTask = await TaskService.updateTask(
        Number(id),
        {
          title,
          text,
        },
        user.id,
      );

      if (!updatedTask) {
        return res
          .status(404)
          .json(formatResponse(404, 'Задача для обновления не найдена'));
      }

      return res
        .status(200)
        .json(formatResponse(200, 'Задача изменена', updatedTask));
    } catch (error) {
      console.log('======== TaskController.update =========');
      console.log(error);
      return res
        .status(500)
        .json(formatResponse(500, 'Ошибка при обновлении задачи'));
    }
  }

  static async delete(req, res) {
    const { id } = req.params;
    const { user } = res.locals;

    if (Number.isNaN(Number(id))) {
      return res.status(400).json(formatResponse(400, 'Неверный формат ID'));
    }

    try {
      const deleted = await TaskService.deleteTask(Number(id), user.id);

      if (!deleted) {
        return res
          .status(404)
          .json(formatResponse(404, 'Задача для удаления не найдена'));
      }

      return res.status(200).json(formatResponse(200, 'Задача удалена'));
    } catch (error) {
      console.log('======== TaskController.delete =========');
      console.log(error);
      return res
        .status(500)
        .json(formatResponse(500, 'Ошибка при удалении задачи'));
    }
  }
}

module.exports = TaskController;
