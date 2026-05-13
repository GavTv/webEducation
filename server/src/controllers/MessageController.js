const MessageService = require('../services/MessageService');
const formatResponse = require('../utils/formatResponse');

class MessageController {
  // GET /api/messenger/groups — мои групповые чаты
  static async listGroups(req, res) {
    try {
      const userId = req.user?.id ?? req.query.userId;
      const role = req.user?.role ?? req.query.role;
      if (!userId || !role) {
        return res.status(400).json(formatResponse(400, 'userId и role обязательны'));
      }
      const groups = await MessageService.listGroupsForUser(userId, role);
      return res.status(200).json(formatResponse(200, 'OK', groups));
    } catch (error) {
      return res.status(500).json(formatResponse(500, 'Ошибка сервера', null, error.message));
    }
  }

  // POST /api/messenger/groups — создать группу
  static async createGroup(req, res) {
    try {
      const creatorId = req.user?.id ?? req.body.creatorId;
      const role = req.user?.role ?? req.body.role;
      const { title, memberIds } = req.body;

      if (!title?.trim()) {
        return res.status(400).json(formatResponse(400, 'Нужно название группы'));
      }
      if (!Array.isArray(memberIds) || memberIds.length === 0) {
        return res.status(400).json(formatResponse(400, 'Нужен список memberIds'));
      }

      const group = await MessageService.createGroup({
        title: title.trim(),
        creatorId,
        memberIds,
        role,
      });
      return res.status(201).json(formatResponse(201, 'Группа создана', group));
    } catch (error) {
      return res.status(500).json(formatResponse(500, 'Ошибка сервера', null, error.message));
    }
  }

  // GET /api/messenger/groups/:groupId/messages
  static async listGroupMessages(req, res) {
    try {
      const { groupId } = req.params;
      const userId = req.user?.id ?? req.query.userId;
      const role = req.user?.role ?? req.query.role;

      if (!userId || !role) {
        return res.status(400).json(formatResponse(400, 'userId и role обязательны'));
      }

      const messages = await MessageService.getGroupMessages(groupId, userId, role);
      if (messages === null) {
        return res.status(404).json(formatResponse(404, 'Группа не найдена или вы не входите в неё'));
      }
      return res.status(200).json(formatResponse(200, 'OK', messages));
    } catch (error) {
      return res.status(500).json(formatResponse(500, 'Ошибка сервера', null, error.message));
    }
  }

  // POST /api/messenger/groups/:groupId/messages
  static async sendGroupMessage(req, res) {
    try {
      const { groupId } = req.params;
      const { text } = req.body;
      const senderId = req.user?.id ?? req.body.senderId;
      const role = req.user?.role ?? req.body.role;

      if (!text?.trim()) {
        return res.status(400).json(formatResponse(400, 'Нужен текст сообщения'));
      }
      if (!senderId || !role) {
        return res.status(400).json(formatResponse(400, 'senderId и role обязательны'));
      }

      const msg = await MessageService.sendGroupMessage({
        groupId,
        senderId,
        text: text.trim(),
        role,
      });
      return res.status(201).json(formatResponse(201, 'Отправлено', msg));
    } catch (error) {
      return res.status(500).json(formatResponse(500, 'Ошибка сервера', null, error.message));
    }
  }
}

module.exports = MessageController;
