const bcrypt = require('bcrypt');
const { Room, RoomMember, Message } = require('../db/models');

const COLORS = ['purple', 'blue', 'green'];

class ClassRoomService {
  static isGroupRoom(room) {
    return room && !room.parentRoomId;
  }

  static async isMember(roomId, userId) {
    const row = await RoomMember.findOne({
      where: { roomId, userId },
    });
    return Boolean(row);
  }

  static async canAccessChatRoom(roomId, userId) {
    const room = await Room.findByPk(roomId);
    if (!room) return false;

    const membershipRoomId = room.parentRoomId ?? room.id;
    return this.isMember(membershipRoomId, userId);
  }

  static async listForUser(user) {
    const rooms = await Room.findAll({
      where: { parentRoomId: null },
      order: [['createdAt', 'DESC']],
    });

    const memberRows = user?.id
      ? await RoomMember.findAll({
          where: { userId: user.id },
          attributes: ['roomId'],
          raw: true,
        })
      : [];
    const memberRoomIds = new Set(memberRows.map((r) => r.roomId));

    const counts = await RoomMember.findAll({
      attributes: [
        'roomId',
        [
          RoomMember.sequelize.fn('COUNT', RoomMember.sequelize.col('id')),
          'memberCount',
        ],
      ],
      group: ['roomId'],
      raw: true,
    });

    const countByRoom = new Map(
      counts.map((row) => [row.roomId, Number(row.memberCount) || 0]),
    );

    return rooms.map((room) => {
      const plain = room.get();
      const hasPassword = Boolean(plain.joinPasswordHash);
      delete plain.joinPasswordHash;
      return {
        ...plain,
        memberCount: countByRoom.get(plain.id) ?? 0,
        hasPassword,
        isMember: memberRoomIds.has(plain.id),
      };
    });
  }

  static async listChannels(groupId, user) {
    const group = await Room.findByPk(groupId);
    if (!group || group.parentRoomId) return { error: 'not_found' };

    const isMember = await this.isMember(groupId, user.id);
    const canManage = this.canUserManageRoom(user, group);

    if (!isMember && !canManage) {
      return { error: 'forbidden' };
    }

    await this.ensureDefaultChannel(group);

    const channels = await Room.findAll({
      where: { parentRoomId: groupId },
      order: [['createdAt', 'ASC']],
    });

    return {
      group: {
        id: group.id,
        title: group.title,
        color: group.color,
      },
      channels: channels.map((channel) => {
        const plain = channel.get();
        delete plain.joinPasswordHash;
        return plain;
      }),
    };
  }

  static async ensureDefaultChannel(group) {
    const count = await Room.count({ where: { parentRoomId: group.id } });
    if (count > 0) return null;

    return Room.create({
      title: 'Общий',
      parentRoomId: group.id,
      type: 'channel',
      createdBy: group.createdBy,
      color: group.color || 'purple',
      description: null,
    });
  }

  static async getAccess(roomId, user) {
    const room = await Room.findByPk(roomId);
    if (!room || room.parentRoomId) return { error: 'not_found' };

    const isMember = await this.isMember(roomId, user.id);
    if (this.canUserManageRoom(user, room) || isMember) {
      return { hasAccess: true, needsPassword: false, isMember: true };
    }

    const needsPassword = Boolean(room.joinPasswordHash);
    if (!needsPassword) {
      return { hasAccess: true, needsPassword: false, isMember: false };
    }

    return { hasAccess: false, needsPassword: true, isMember: false };
  }

  static async joinRoom(roomId, user, password) {
    const room = await Room.findByPk(roomId);
    if (!room || room.parentRoomId) return { error: 'not_found' };

    if (this.canUserManageRoom(user, room)) {
      await RoomMember.findOrCreate({
        where: { roomId, userId: user.id },
      });
      return { ok: true };
    }

    if (await this.isMember(roomId, user.id)) {
      return { ok: true };
    }

    if (!room.joinPasswordHash) {
      await RoomMember.create({ roomId, userId: user.id });
      return { ok: true };
    }

    const pwd = typeof password === 'string' ? password.trim() : '';
    if (!pwd) {
      return { error: 'password_required' };
    }

    const valid = await bcrypt.compare(pwd, room.joinPasswordHash);
    if (!valid) {
      return { error: 'invalid_password' };
    }

    await RoomMember.create({ roomId, userId: user.id });
    return { ok: true };
  }

  static canUserManageRoom(user, room) {
    if (!user || !room || room.parentRoomId) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'teacher' && room.createdBy === user.id) return true;
    return false;
  }

  static async canUserManageRoomAsync(user, room) {
    if (!user || !room) return false;
    if (user.role === 'admin') return true;

    if (!room.parentRoomId && user.role === 'teacher' && room.createdBy === user.id) {
      return true;
    }

    if (room.parentRoomId && user.role === 'teacher') {
      const parent = await Room.findByPk(room.parentRoomId);
      return parent ? parent.createdBy === user.id : false;
    }

    return false;
  }

  static pickColor(roomId) {
    return COLORS[roomId % COLORS.length];
  }

  static async create({ title, description, joinPassword, createdBy }) {
    const room = await Room.create({
      title: title.trim(),
      description: description?.trim() || null,
      createdBy,
      type: 'group',
      parentRoomId: null,
      color: 'purple',
    });

    await room.update({ color: this.pickColor(room.id) });

    if (joinPassword && String(joinPassword).trim()) {
      const hash = await bcrypt.hash(String(joinPassword).trim(), 10);
      await room.update({ joinPasswordHash: hash });
    }

    await RoomMember.findOrCreate({
      where: { roomId: room.id, userId: createdBy },
    });

    await this.ensureDefaultChannel(room);

    const listed = await this.listForUser({ id: createdBy });
    return listed.find((r) => r.id === room.id) ?? room.get();
  }

  static async createChannel(groupId, user, { title }) {
    const group = await Room.findByPk(groupId);
    if (!group || group.parentRoomId) return { error: 'not_found' };

    if (!(await this.canUserManageRoomAsync(user, group))) {
      return { error: 'forbidden' };
    }

    const channelTitle = typeof title === 'string' ? title.trim() : '';
    if (!channelTitle) return { error: 'title_required' };

    const channel = await Room.create({
      title: channelTitle,
      parentRoomId: groupId,
      type: 'channel',
      createdBy: user.id,
      color: group.color || this.pickColor(groupId),
      description: null,
    });

    return { channel: channel.get() };
  }

  static async update(roomId, user, { title, description }) {
    const room = await Room.findByPk(roomId);
    if (!room || room.parentRoomId) return { error: 'not_found' };
    if (!(await this.canUserManageRoomAsync(user, room))) {
      return { error: 'forbidden' };
    }

    const patch = {};
    if (typeof title === 'string' && title.trim()) patch.title = title.trim();
    if (description !== undefined) {
      patch.description = description?.trim() || null;
    }
    await room.update(patch);

    const listed = await this.listForUser(user);
    return { room: listed.find((r) => r.id === room.id) };
  }

  static async delete(roomId, user) {
    const room = await Room.findByPk(roomId);
    if (!room) return { error: 'not_found' };
    if (!(await this.canUserManageRoomAsync(user, room))) {
      return { error: 'forbidden' };
    }

    if (room.parentRoomId) {
      await Message.destroy({ where: { roomId } });
      await room.destroy();
      return { ok: true, deleted: 'channel' };
    }

    const children = await Room.findAll({ where: { parentRoomId: roomId } });
    for (const child of children) {
      await Message.destroy({ where: { roomId: child.id } });
      await child.destroy();
    }

    await RoomMember.destroy({ where: { roomId } });
    await Message.destroy({ where: { roomId } });
    await room.destroy();

    return { ok: true, deleted: 'group' };
  }

  static async deleteChannel(groupId, channelId, user) {
    const group = await Room.findByPk(groupId);
    if (!group || group.parentRoomId) return { error: 'not_found' };

    const channel = await Room.findOne({
      where: { id: channelId, parentRoomId: groupId },
    });
    if (!channel) return { error: 'not_found' };
    if (!(await this.canUserManageRoomAsync(user, group))) {
      return { error: 'forbidden' };
    }

    await Message.destroy({ where: { roomId: channel.id } });
    await channel.destroy();

    return { ok: true };
  }

  static async clearRoomMessages(roomId, user) {
    const room = await Room.findByPk(roomId);
    if (!room) return { error: 'not_found' };

    const membershipRoomId = room.parentRoomId ?? room.id;

    if (user?.role === 'admin') {
      await Message.destroy({ where: { roomId } });
      return { ok: true, roomId };
    }

    if (user?.role === 'teacher') {
      const isMember = await this.isMember(membershipRoomId, user.id);
      if (!isMember) return { error: 'forbidden' };
      await Message.destroy({ where: { roomId } });
      return { ok: true, roomId };
    }

    return { error: 'forbidden' };
  }

  static async setPassword(roomId, user, joinPassword) {
    const room = await Room.findByPk(roomId);
    if (!room || room.parentRoomId) return { error: 'not_found' };
    if (!(await this.canUserManageRoomAsync(user, room))) {
      return { error: 'forbidden' };
    }

    if (!joinPassword || !String(joinPassword).trim()) {
      await room.update({ joinPasswordHash: null });
    } else {
      const hash = await bcrypt.hash(String(joinPassword).trim(), 10);
      await room.update({ joinPasswordHash: hash });
    }

    const listed = await this.listForUser(user);
    return { room: listed.find((r) => r.id === room.id) };
  }
}

module.exports = ClassRoomService;
