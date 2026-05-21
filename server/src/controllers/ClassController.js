const ClassRoomService = require('../services/ClassRoomService');
const formatResponse = require('../utils/formatResponse');

class ClassController {
  static async list(req, res) {
    try {
      const classes = await ClassRoomService.listForUser(res.locals.user);
      return res.status(200).json(
        formatResponse(200, 'Список групп', { classes }),
      );
    } catch (error) {
      console.log('======== ClassController.list =========');
      console.log(error);
      return res
        .status(500)
        .json(formatResponse(500, 'Ошибка при загрузке классов'));
    }
  }

  static async create(req, res) {
    try {
      const user = res.locals.user;
      const { title, description, joinPassword } = req.body ?? {};

      if (!title || typeof title !== 'string' || !title.trim()) {
        return res
          .status(400)
          .json(formatResponse(400, 'Укажите название класса'));
      }

      const room = await ClassRoomService.create({
        title,
        description,
        joinPassword,
        createdBy: user.id,
      });

      return res.status(201).json(
        formatResponse(201, 'Группа создана', { class: room }),
      );
    } catch (error) {
      console.log('======== ClassController.create =========');
      console.log(error);
      return res
        .status(500)
        .json(formatResponse(500, 'Ошибка при создании класса'));
    }
  }

  static async update(req, res) {
    try {
      const user = res.locals.user;
      const roomId = Number(req.params.id);
      const { title, description } = req.body ?? {};

      const result = await ClassRoomService.update(roomId, user, {
        title,
        description,
      });

      if (result.error === 'not_found') {
        return res.status(404).json(formatResponse(404, 'Класс не найден'));
      }
      if (result.error === 'forbidden') {
        return res
          .status(403)
          .json(formatResponse(403, 'Нет прав на редактирование этого класса'));
      }

      return res.status(200).json(
        formatResponse(200, 'Класс обновлён', { class: result.room }),
      );
    } catch (error) {
      console.log('======== ClassController.update =========');
      console.log(error);
      return res
        .status(500)
        .json(formatResponse(500, 'Ошибка при обновлении класса'));
    }
  }

  static async getAccess(req, res) {
    try {
      const user = res.locals.user;
      const roomId = Number(req.params.id);
      const access = await ClassRoomService.getAccess(roomId, user);

      if (access.error === 'not_found') {
        return res.status(404).json(formatResponse(404, 'Класс не найден'));
      }

      return res.status(200).json(
        formatResponse(200, 'Доступ к классу', { access }),
      );
    } catch (error) {
      console.log('======== ClassController.getAccess =========');
      console.log(error);
      return res
        .status(500)
        .json(formatResponse(500, 'Ошибка при проверке доступа'));
    }
  }

  static async join(req, res) {
    try {
      const user = res.locals.user;
      const roomId = Number(req.params.id);
      const { password } = req.body ?? {};

      const result = await ClassRoomService.joinRoom(roomId, user, password);

      if (result.error === 'not_found') {
        return res.status(404).json(formatResponse(404, 'Класс не найден'));
      }
      if (result.error === 'password_required') {
        return res
          .status(400)
          .json(formatResponse(400, 'Введите пароль класса'));
      }
      if (result.error === 'invalid_password') {
        return res
          .status(400)
          .json(formatResponse(400, 'Неверный пароль'));
      }

      return res.status(200).json(
        formatResponse(200, 'Доступ к классу получен', { joined: true }),
      );
    } catch (error) {
      console.log('======== ClassController.join =========');
      console.log(error);
      return res
        .status(500)
        .json(formatResponse(500, 'Ошибка при входе в класс'));
    }
  }

  static async remove(req, res) {
    try {
      const user = res.locals.user;
      const roomId = Number(req.params.id);

      const result = await ClassRoomService.delete(roomId, user);

      if (result.error === 'not_found') {
        return res.status(404).json(formatResponse(404, 'Класс не найден'));
      }
      if (result.error === 'forbidden') {
        return res
          .status(403)
          .json(formatResponse(403, 'Нет прав на удаление этого класса'));
      }

      return res.status(200).json(formatResponse(200, 'Группа удалена'));
    } catch (error) {
      console.log('======== ClassController.remove =========');
      console.log(error);
      return res
        .status(500)
        .json(formatResponse(500, 'Ошибка при удалении группы'));
    }
  }

  static async listChannels(req, res) {
    try {
      const user = res.locals.user;
      const groupId = Number(req.params.groupId);
      const result = await ClassRoomService.listChannels(groupId, user);

      if (result.error === 'not_found') {
        return res.status(404).json(formatResponse(404, 'Группа не найдена'));
      }
      if (result.error === 'forbidden') {
        return res
          .status(403)
          .json(formatResponse(403, 'Нет доступа к чатам этой группы'));
      }

      return res.status(200).json(
        formatResponse(200, 'Чаты группы', {
          group: result.group,
          channels: result.channels,
        }),
      );
    } catch (error) {
      console.log('======== ClassController.listChannels =========');
      console.log(error);
      return res
        .status(500)
        .json(formatResponse(500, 'Ошибка при загрузке чатов группы'));
    }
  }

  static async createChannel(req, res) {
    try {
      const user = res.locals.user;
      const groupId = Number(req.params.groupId);
      const { title } = req.body ?? {};

      const result = await ClassRoomService.createChannel(groupId, user, {
        title,
      });

      if (result.error === 'not_found') {
        return res.status(404).json(formatResponse(404, 'Группа не найдена'));
      }
      if (result.error === 'forbidden') {
        return res
          .status(403)
          .json(formatResponse(403, 'Нет прав на создание чата в группе'));
      }
      if (result.error === 'title_required') {
        return res
          .status(400)
          .json(formatResponse(400, 'Укажите название чата'));
      }

      return res.status(201).json(
        formatResponse(201, 'Чат создан', { channel: result.channel }),
      );
    } catch (error) {
      console.log('======== ClassController.createChannel =========');
      console.log(error);
      return res
        .status(500)
        .json(formatResponse(500, 'Ошибка при создании чата'));
    }
  }

  static async removeChannel(req, res) {
    try {
      const user = res.locals.user;
      const groupId = Number(req.params.groupId);
      const channelId = Number(req.params.channelId);

      const result = await ClassRoomService.deleteChannel(
        groupId,
        channelId,
        user,
      );

      if (result.error === 'not_found') {
        return res.status(404).json(formatResponse(404, 'Чат не найден'));
      }
      if (result.error === 'forbidden') {
        return res
          .status(403)
          .json(formatResponse(403, 'Нет прав на удаление чата'));
      }

      return res.status(200).json(formatResponse(200, 'Чат удалён'));
    } catch (error) {
      console.log('======== ClassController.removeChannel =========');
      console.log(error);
      return res
        .status(500)
        .json(formatResponse(500, 'Ошибка при удалении чата'));
    }
  }

  static async setPassword(req, res) {
    try {
      const user = res.locals.user;
      const roomId = Number(req.params.id);
      const { joinPassword } = req.body ?? {};

      const result = await ClassRoomService.setPassword(
        roomId,
        user,
        joinPassword,
      );

      if (result.error === 'not_found') {
        return res.status(404).json(formatResponse(404, 'Класс не найден'));
      }
      if (result.error === 'forbidden') {
        return res
          .status(403)
          .json(formatResponse(403, 'Нет прав на изменение пароля класса'));
      }

      return res.status(200).json(
        formatResponse(200, 'Пароль класса обновлён', { class: result.room }),
      );
    } catch (error) {
      console.log('======== ClassController.setPassword =========');
      console.log(error);
      return res
        .status(500)
        .json(formatResponse(500, 'Ошибка при установке пароля'));
    }
  }
}

module.exports = ClassController;
