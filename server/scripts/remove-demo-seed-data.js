/**
 * Удаляет демо-группы/сообщения из сида demo-rooms-members-messages.
 * Запуск: node scripts/remove-demo-seed-data.js
 * Прод (Neon): NODE_ENV=production node scripts/remove-demo-seed-data.js
 */
require('../src/utils/loadEnv')();

const { Message, Room, RoomMember, sequelize } = require('../src/db/models');
const { Op } = require('sequelize');

const DEMO_ROOM_IDS = [101, 102, 103];
const DEMO_MESSAGE_TEXTS = [
  'Всем привет! Это тестовое сообщение в комнате 1 класса.',
  'Привет! Проверяем работу API сообщений.',
  'Чат 2 класса создан и работает.',
  'Не забудьте сделать домашнее задание.',
];

async function main() {
  const byText = await Message.destroy({
    where: { text: { [Op.in]: DEMO_MESSAGE_TEXTS } },
  });

  const [byLike] = await sequelize.query(
    `DELETE FROM "Messages"
     WHERE text ILIKE '%тестовое сообщение%'
        OR text ILIKE '%Проверяем работу API%'
        OR text ILIKE '%Чат 2 класса создан%'
        OR text ILIKE '%Не забудьте сделать домашнее%'
     RETURNING id`,
  );
  const byLikeCount = Array.isArray(byLike) ? byLike.length : 0;

  const byRoom = await Message.destroy({
    where: { roomId: { [Op.in]: DEMO_ROOM_IDS } },
  });

  await RoomMember.destroy({ where: { roomId: { [Op.in]: DEMO_ROOM_IDS } } });
  const rooms = await Room.destroy({ where: { id: { [Op.in]: DEMO_ROOM_IDS } } });

  console.log(
    `Готово: точный текст ${byText}, похожие ${byLikeCount}, по roomId ${byRoom}, комнат ${rooms}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
