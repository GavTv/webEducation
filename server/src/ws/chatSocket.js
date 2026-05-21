const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const { Message, Room, RoomMember, User } = require('../db/models');
const ClassRoomService = require('../services/ClassRoomService');
const { getCorsOrigins } = require('../config/corsOrigins');
const { sanitizeAvatarUrl } = require('../utils/avatarFiles');

try {
  process.loadEnvFile();
} catch (_) {}

const MAX_MESSAGE_LENGTH = 1000;

function getTokenFromSocket(socket) {
  const authToken = socket.handshake.auth?.token;

  if (authToken) {
    return authToken;
  }

  const header = socket.handshake.headers?.authorization;

  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    return header.replace('Bearer ', '');
  }

  return null;
}

function getSocketRoomName(roomId) {
  return `room:${roomId}`;
}

function getRoomIdFromPayload(payload) {
  return Number(payload?.roomId || payload?.groupId || payload?.channelId);
}

function getSenderRole(user) {
  const role = user?.role;

  if (['student', 'teacher', 'admin'].includes(role)) {
    return role;
  }

  return 'student';
}

async function checkRoomMember(roomId, userId) {
  const room = await Room.findByPk(roomId);
  if (!room) return false;

  const membershipRoomId = room.parentRoomId ?? roomId;

  const member = await RoomMember.findOne({
    where: {
      roomId: membershipRoomId,
      userId,
    },
  });

  return Boolean(member);
}

async function getMessageWithSender(messageId) {
  const row = await Message.findByPk(messageId, {
    include: [
      {
        model: User,
        as: 'sender',
        attributes: ['id', 'name', 'email', 'username', 'avatarUrl'],
      },
    ],
  });

  return serializeMessage(row);
}

function sanitizeSender(sender) {
  if (!sender) return sender;

  const plain = sender.get ? sender.get({ plain: true }) : sender;

  return {
    ...plain,
    avatarUrl: sanitizeAvatarUrl(plain.avatarUrl),
  };
}

function serializeMessage(message) {
  if (!message) return message;

  const plain = message.get ? message.get({ plain: true }) : message;

  return {
    ...plain,
    sender: sanitizeSender(plain.sender),
  };
}

async function getRoomMessageHistory(roomId) {
  const rows = await Message.findAll({
    where: { roomId },
    include: [
      {
        model: User,
        as: 'sender',
        attributes: ['id', 'name', 'email', 'username', 'avatarUrl'],
      },
    ],
    order: [['createdAt', 'ASC']],
  });

  return rows.map(serializeMessage);
}

function initChatSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: getCorsOrigins(),
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token = getTokenFromSocket(socket);

      if (!token) {
        return next(new Error('Access token is required'));
      }

      const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

      if (!payload?.user?.id) {
        return next(new Error('Invalid access token'));
      }

      socket.data.user = {
        ...payload.user,
        avatarUrl: sanitizeAvatarUrl(payload.user.avatarUrl),
      };

      return next();
    } catch (error) {
      console.log('======== socket auth error =========');
      console.log(error.message);

      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;

    socket.emit('ws:ready', {
      message: 'WS connected',
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        avatarUrl: sanitizeAvatarUrl(user.avatarUrl),
      },
    });

    async function joinRoom(payload, callback) {
      try {
        const roomId = getRoomIdFromPayload(payload);

        if (!roomId) {
          const response = {
            status: 'error',
            message: 'roomId is required',
          };

          socket.emit('room:error', response);

          if (typeof callback === 'function') {
            callback(response);
          }

          return;
        }

        const isMember = await checkRoomMember(roomId, user.id);

        if (!isMember) {
          const response = {
            status: 'error',
            message: 'You are not a member of this room',
          };

          socket.emit('room:error', response);

          if (typeof callback === 'function') {
            callback(response);
          }

          return;
        }

        const prev = socket.data.currentRoomId;
        if (prev && prev !== roomId) {
          socket.leave(getSocketRoomName(prev));
        }

        socket.join(getSocketRoomName(roomId));
        socket.data.currentRoomId = roomId;

        const messages = await getRoomMessageHistory(roomId);

        socket.emit('room:history', { roomId, messages });
        socket.emit('channel:history', { channelId: roomId, messages });

        const response = {
          status: 'ok',
          event: 'room:joined',
          roomId,
        };

        socket.emit('room:joined', response);

        if (typeof callback === 'function') {
          callback(response);
        }
      } catch (error) {
        console.log('======== socket room join error =========');
        console.log(error);

        const response = {
          status: 'error',
          message: 'Room join error',
        };

        socket.emit('room:error', response);

        if (typeof callback === 'function') {
          callback(response);
        }
      }
    }

    socket.on('room:join', joinRoom);
    socket.on('group:join', joinRoom);
    socket.on('channel:join', joinRoom);

    async function clearRoom(payload, callback) {
      try {
        const roomId = getRoomIdFromPayload(payload);

        if (!roomId) {
          const response = {
            status: 'error',
            message: 'roomId is required',
          };

          socket.emit('room:error', response);

          if (typeof callback === 'function') {
            callback(response);
          }

          return;
        }

        const result = await ClassRoomService.clearRoomMessages(roomId, user);

        if (result.error === 'not_found') {
          const response = {
            status: 'error',
            message: 'Room not found',
          };

          socket.emit('room:error', response);

          if (typeof callback === 'function') {
            callback(response);
          }

          return;
        }

        if (result.error === 'forbidden') {
          const response = {
            status: 'error',
            message: 'Недостаточно прав для очистки чата',
          };

          socket.emit('room:error', response);

          if (typeof callback === 'function') {
            callback(response);
          }

          return;
        }

        const emptyHistory = { roomId, messages: [] };

        io.to(getSocketRoomName(roomId)).emit('room:history', emptyHistory);
        io.to(getSocketRoomName(roomId)).emit('channel:history', {
          channelId: roomId,
          messages: [],
        });
        io.to(getSocketRoomName(roomId)).emit('room:cleared', { roomId });

        const response = {
          status: 'ok',
          event: 'room:cleared',
          roomId,
        };

        if (typeof callback === 'function') {
          callback(response);
        }
      } catch (error) {
        console.log('======== socket room clear error =========');
        console.log(error);

        const response = {
          status: 'error',
          message: 'Room clear error',
        };

        socket.emit('room:error', response);

        if (typeof callback === 'function') {
          callback(response);
        }
      }
    }

    socket.on('room:clear', clearRoom);
    socket.on('channel:clear', clearRoom);

    socket.on('message:send', async (payload, callback) => {
      try {
        const roomId = getRoomIdFromPayload(payload);
        const text =
          typeof payload?.text === 'string' ? payload.text.trim() : '';

        if (!roomId) {
          const response = {
            status: 'error',
            message: 'roomId is required',
          };

          socket.emit('message:error', response);

          if (typeof callback === 'function') {
            callback(response);
          }

          return;
        }

        if (!text) {
          const response = {
            status: 'error',
            message: 'Message text is required',
          };

          socket.emit('message:error', response);

          if (typeof callback === 'function') {
            callback(response);
          }

          return;
        }

        if (text.length > MAX_MESSAGE_LENGTH) {
          const response = {
            status: 'error',
            message: `Message text must be shorter than ${MAX_MESSAGE_LENGTH} symbols`,
          };

          socket.emit('message:error', response);

          if (typeof callback === 'function') {
            callback(response);
          }

          return;
        }

        const isMember = await checkRoomMember(roomId, user.id);

        if (!isMember) {
          const response = {
            status: 'error',
            message: 'You are not a member of this room',
          };

          socket.emit('message:error', response);

          if (typeof callback === 'function') {
            callback(response);
          }

          return;
        }

        socket.join(getSocketRoomName(roomId));

        const createdMessage = await Message.create({
          roomId,
          senderId: user.id,
          senderRole: getSenderRole(user),
          text,
        });

        const message = await getMessageWithSender(createdMessage.id);

        const response = {
          status: 'ok',
          event: 'message:new',
          message,
        };

        io.to(getSocketRoomName(roomId)).emit('message:new', {
          message,
        });

        if (typeof callback === 'function') {
          callback(response);
        }
      } catch (error) {
        console.log('======== socket message send error =========');
        console.log(error);

        const response = {
          status: 'error',
          message: 'Message send error',
        };

        socket.emit('message:error', response);

        if (typeof callback === 'function') {
          callback(response);
        }
      }
    });

    socket.on('disconnect', () => {
      const roomId = socket.data.currentRoomId;

      if (roomId) {
        socket.leave(getSocketRoomName(roomId));
      }
    });
  });

  console.log('WS на порту 3000, события как в контракте');

  return io;
}

module.exports = initChatSocket;
