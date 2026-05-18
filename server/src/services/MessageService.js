const { Room, RoomMember, Message, User } = require('../db/models');

class MessageService {
  static async listGroupsForUser(userId) {
    const memberships = await RoomMember.findAll({
      where: { userId },
      include: [
        {
          model: Room,
          as: 'room',
          include: [
            {
              model: RoomMember,
              as: 'members',
              include: [
                {
                  model: User,
                  as: 'user',
                  attributes: ['id', 'name', 'email', 'username', 'avatarUrl'],
                },
              ],
            },
          ],
        },
      ],
      order: [['createdAt', 'ASC']],
    });

    return memberships
      .map((membership) => membership.room)
      .filter(Boolean);
  }

  static async createGroup({ title, creatorId, memberIds = [], role = 'student' }) {
    const uniqueMemberIds = Array.from(
      new Set([creatorId, ...memberIds].filter(Boolean).map(Number)),
    );

    const room = await Room.create({
      title,
      createdBy: creatorId,
      type: 'group',
    });

    await RoomMember.bulkCreate(
      uniqueMemberIds.map((userId) => ({
        roomId: room.id,
        userId,
        role: userId === Number(creatorId) ? role : 'user',
      })),
      {
        ignoreDuplicates: true,
      },
    );

    return Room.findByPk(room.id, {
      include: [
        {
          model: RoomMember,
          as: 'members',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email', 'username', 'avatarUrl'],
            },
          ],
        },
      ],
    });
  }

  static async isRoomMember(roomId, userId) {
    const member = await RoomMember.findOne({
      where: {
        roomId,
        userId,
      },
    });

    return Boolean(member);
  }

  static async getGroupMessages(groupId, userId) {
    const room = await Room.findByPk(groupId);

    if (!room) {
      return null;
    }

    const isMember = await this.isRoomMember(groupId, userId);

    if (!isMember) {
      return null;
    }

    return Message.findAll({
      where: { roomId: groupId },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'name', 'email', 'username', 'avatarUrl'],
        },
      ],
      order: [['createdAt', 'ASC']],
    });
  }

  static async sendGroupMessage({ groupId, senderId, text, role = 'student' }) {
    const room = await Room.findByPk(groupId);

    if (!room) {
      const error = new Error('Room not found');
      error.statusCode = 404;
      throw error;
    }

    const isMember = await this.isRoomMember(groupId, senderId);

    if (!isMember) {
      const error = new Error('You are not a member of this room');
      error.statusCode = 403;
      throw error;
    }

    const message = await Message.create({
      roomId: groupId,
      senderId,
      senderRole: role || 'student',
      text,
    });

    return Message.findByPk(message.id, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'name', 'email', 'username', 'avatarUrl'],
        },
      ],
    });
  }
}

module.exports = MessageService;
