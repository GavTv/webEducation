const bcrypt = require('bcrypt');
const { Room, RoomMember, Message } = require('../db/models');

const COLORS = ['purple', 'blue', 'green'];

class ClassRoomService {
  static async isMember(roomId, userId) {
    const row = await RoomMember.findOne({
      where: { roomId, userId },
    });
    return Boolean(row);
  }

  static async listForUser(user) {
    const rooms = await Room.findAll({
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

  static async getAccess(roomId, user) {
    const room = await Room.findByPk(roomId);
    if (!room) return { error: 'not_found' };

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
    if (!room) return { error: 'not_found' };

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
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'teacher' && room.createdBy === user.id) return true;
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

    const listed = await this.listForUser({ id: createdBy });
    return listed.find((r) => r.id === room.id) ?? room.get();
  }

  static async update(roomId, user, { title, description }) {
    const room = await Room.findByPk(roomId);
    if (!room) return { error: 'not_found' };
    if (!this.canUserManageRoom(user, room)) return { error: 'forbidden' };

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
    if (!this.canUserManageRoom(user, room)) return { error: 'forbidden' };

    await RoomMember.destroy({ where: { roomId } });
    await Message.destroy({ where: { roomId } });
    await room.destroy();

    return { ok: true };
  }

  static async clearRoomMessages(roomId, user) {
    const room = await Room.findByPk(roomId);
    if (!room) return { error: 'not_found' };

    if (user?.role === 'admin') {
      await Message.destroy({ where: { roomId } });
      return { ok: true, roomId };
    }

    if (user?.role === 'teacher') {
      const isMember = await this.isMember(roomId, user.id);
      if (!isMember) return { error: 'forbidden' };
      await Message.destroy({ where: { roomId } });
      return { ok: true, roomId };
    }

    return { error: 'forbidden' };
  }

  static async setPassword(roomId, user, joinPassword) {
    const room = await Room.findByPk(roomId);
    if (!room) return { error: 'not_found' };
    if (!this.canUserManageRoom(user, room)) return { error: 'forbidden' };

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
