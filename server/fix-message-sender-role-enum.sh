#!/bin/bash

set -e

echo "========== Проверяем enum_Messages_senderRole =========="

psql -U artmxvdb -d webeducation -c "SELECT enumlabel FROM pg_enum WHERE enumtypid = '\"enum_Messages_senderRole\"'::regtype;"

echo "========== Перезаписываем сидер на безопасный =========="

cat > src/db/seeders/20260515173020-demo-rooms-members-messages.js <<'EOF'
'use strict';

const now = new Date();

module.exports = {
  async up(queryInterface) {
    const messageRoles = await queryInterface.sequelize.query(
      `SELECT enumlabel
       FROM pg_enum
       WHERE enumtypid = '"enum_Messages_senderRole"'::regtype
       ORDER BY enumsortorder ASC;`,
      {
        type: queryInterface.sequelize.QueryTypes.SELECT,
      },
    );

    const allowedMessageRoles = messageRoles.map((role) => role.enumlabel);
    const senderRole = allowedMessageRoles.includes('student')
      ? 'student'
      : allowedMessageRoles[0];

    if (!senderRole) {
      throw new Error('Не найдено допустимое значение enum_Messages_senderRole');
    }

    const users = await queryInterface.sequelize.query(
      'SELECT id, name, email FROM "Users" ORDER BY id ASC LIMIT 5;',
      {
        type: queryInterface.sequelize.QueryTypes.SELECT,
      },
    );

    if (!users.length) {
      console.log('Seeder skipped: no users in Users table');
      return;
    }

    const firstUser = users[0];
    const secondUser = users[1] || users[0];
    const thirdUser = users[2] || users[0];

    await queryInterface.bulkInsert(
      'Rooms',
      [
        {
          id: 101,
          title: '1 класс',
          type: 'group',
          createdBy: firstUser.id,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 102,
          title: '2 класс',
          type: 'group',
          createdBy: firstUser.id,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 103,
          title: 'Домашние задания',
          type: 'group',
          createdBy: firstUser.id,
          createdAt: now,
          updatedAt: now,
        },
      ],
      {
        ignoreDuplicates: true,
      },
    );

    await queryInterface.bulkInsert(
      'RoomMembers',
      [
        {
          roomId: 101,
          userId: firstUser.id,
          role: 'user',
          createdAt: now,
          updatedAt: now,
        },
        {
          roomId: 101,
          userId: secondUser.id,
          role: 'user',
          createdAt: now,
          updatedAt: now,
        },
        {
          roomId: 102,
          userId: firstUser.id,
          role: 'user',
          createdAt: now,
          updatedAt: now,
        },
        {
          roomId: 102,
          userId: thirdUser.id,
          role: 'user',
          createdAt: now,
          updatedAt: now,
        },
        {
          roomId: 103,
          userId: firstUser.id,
          role: 'user',
          createdAt: now,
          updatedAt: now,
        },
      ],
      {
        ignoreDuplicates: true,
      },
    );

    await queryInterface.bulkDelete('Messages', {
      roomId: [101, 102, 103],
    });

    await queryInterface.bulkInsert(
      'Messages',
      [
        {
          roomId: 101,
          senderId: firstUser.id,
          senderRole,
          text: 'Всем привет! Это тестовое сообщение в комнате 1 класса.',
          createdAt: now,
          updatedAt: now,
        },
        {
          roomId: 101,
          senderId: secondUser.id,
          senderRole,
          text: 'Привет! Проверяем работу API сообщений.',
          createdAt: now,
          updatedAt: now,
        },
        {
          roomId: 102,
          senderId: firstUser.id,
          senderRole,
          text: 'Чат 2 класса создан и работает.',
          createdAt: now,
          updatedAt: now,
        },
        {
          roomId: 103,
          senderId: firstUser.id,
          senderRole,
          text: 'Не забудьте сделать домашнее задание.',
          createdAt: now,
          updatedAt: now,
        },
      ],
      {},
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('Messages', {
      roomId: [101, 102, 103],
    });

    await queryInterface.bulkDelete('RoomMembers', {
      roomId: [101, 102, 103],
    });

    await queryInterface.bulkDelete('Rooms', {
      id: [101, 102, 103],
    });
  },
};
EOF

echo "========== Патчим MessageService и MessageController =========="

node <<'NODE'
const fs = require('fs');

const serviceFile = 'src/services/MessageService.js';
const controllerFile = 'src/controllers/MessageController.js';

if (fs.existsSync(serviceFile)) {
  let text = fs.readFileSync(serviceFile, 'utf8');

  text = text.replaceAll(`role = 'user'`, `role = 'student'`);
  text = text.replaceAll(`senderRole: role,`, `senderRole: role || 'student',`);

  fs.writeFileSync(serviceFile, text);
  console.log('PATCHED MessageService.js');
}

if (fs.existsSync(controllerFile)) {
  let text = fs.readFileSync(controllerFile, 'utf8');

  text = text.replaceAll(`user.role || 'user'`, `user.role || 'student'`);

  fs.writeFileSync(controllerFile, text);
  console.log('PATCHED MessageController.js');
}
NODE

echo "========== Готово =========="
