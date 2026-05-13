const { Room, Message, Student, Teacher } = require('../db/models');

class MessageService {
  // Список групповых чатов, где состоит пользователь
  static async listGroupsForUser(userId, role) {
    const where = {};
    if (role === 'student') {
      where.studentId = userId;
    } else if (role === 'teacher') {
      where.teacherId = userId;
    }
    return Room.findAll({ where });
  }

  // Создать групповой чат (комнату)
  static async createGroup({ title, creatorId, memberIds, role }) {
    const room = await Room.create({
      title,
      createdBy: creatorId,
      type: 'group',
    });
    // Здесь позже добавим связь many-to-many с участниками
    return room;
  }

  // Лента сообщений в групповом чате
  static async getGroupMessages(groupId, userId, role) {
    const room = await Room.findByPk(groupId);
    if (!room) return null;

    // Проверка что пользователь участник комнаты (заглушка)
    const messages = await Message.findAll({
      where: { roomId: groupId },
      order: [['createdAt', 'ASC']],
    });
    return messages;
  }

  // Отправить сообщение в группу
  static async sendGroupMessage({ groupId, senderId, text, role }) {
    const room = await Room.findByPk(groupId);
    if (!room) throw new Error('Room not found');

    const message = await Message.create({
      roomId: groupId,
      senderId,
      senderRole: role,
      text,
    });
    return message;
  }
}

module.exports = MessageService;
