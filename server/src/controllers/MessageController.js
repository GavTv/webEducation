const MessageService = require('../services/MessageService');
const formatResponse = require('../utils/formatResponse');

function getCurrentUser(res) {
  return res.locals.user;
}

class MessageController {
  static async listGroups(req, res) {
    try {
      const user = getCurrentUser(res);

      if (!user?.id) {
        return res
          .status(401)
          .json(formatResponse(401, 'Пользователь не авторизован'));
      }

      const groups = await MessageService.listGroupsForUser(user.id);

      return res
        .status(200)
        .json(formatResponse(200, 'Список чатов получен', { groups }));
    } catch (error) {
      console.log('======== MessageController.listGroups =========');
      console.log(error);

      return res
        .status(500)
        .json(formatResponse(500, 'Ошибка сервера при получении чатов'));
    }
  }

  static async createGroup(req, res) {
    try {
      const user = getCurrentUser(res);
      const { title, memberIds = [] } = req.body;

      if (!user?.id) {
        return res
          .status(401)
          .json(formatResponse(401, 'Пользователь не авторизован'));
      }

      if (!title?.trim()) {
        return res
          .status(400)
          .json(formatResponse(400, 'Нужно название комнаты'));
      }

      if (!Array.isArray(memberIds)) {
        return res
          .status(400)
          .json(formatResponse(400, 'memberIds должен быть массивом'));
      }

      const group = await MessageService.createGroup({
        title: title.trim(),
        creatorId: user.id,
        memberIds,
        role: user.role || 'student',
      });

      return res
        .status(201)
        .json(formatResponse(201, 'Комната создана', { group }));
    } catch (error) {
      console.log('======== MessageController.createGroup =========');
      console.log(error);

      return res
        .status(500)
        .json(formatResponse(500, 'Ошибка сервера при создании комнаты'));
    }
  }

  static async listGroupMessages(req, res) {
    try {
      const user = getCurrentUser(res);
      const { groupId } = req.params;

      if (!user?.id) {
        return res
          .status(401)
          .json(formatResponse(401, 'Пользователь не авторизован'));
      }

      const messages = await MessageService.getGroupMessages(groupId, user.id);

      if (messages === null) {
        return res
          .status(404)
          .json(formatResponse(404, 'Комната не найдена или вы не участник'));
      }

      return res
        .status(200)
        .json(formatResponse(200, 'Сообщения получены', { messages }));
    } catch (error) {
      console.log('======== MessageController.listGroupMessages =========');
      console.log(error);

      return res
        .status(500)
        .json(formatResponse(500, 'Ошибка сервера при получении сообщений'));
    }
  }

  static async sendGroupMessage(req, res) {
    try {
      const user = getCurrentUser(res);
      const { groupId } = req.params;
      const { text } = req.body;

      if (!user?.id) {
        return res
          .status(401)
          .json(formatResponse(401, 'Пользователь не авторизован'));
      }

      if (!text?.trim()) {
        return res
          .status(400)
          .json(formatResponse(400, 'Нужен текст сообщения'));
      }

      const message = await MessageService.sendGroupMessage({
        groupId,
        senderId: user.id,
        role: user.role || 'student',
        text: text.trim(),
      });

      return res
        .status(201)
        .json(formatResponse(201, 'Сообщение отправлено', { message }));
    } catch (error) {
      console.log('======== MessageController.sendGroupMessage =========');
      console.log(error);

      if (error.statusCode) {
        return res
          .status(error.statusCode)
          .json(formatResponse(error.statusCode, error.message));
      }

      return res
        .status(500)
        .json(formatResponse(500, 'Ошибка сервера при отправке сообщения'));
    }
  }
}

module.exports = MessageController;
