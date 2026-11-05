const bcrypt = require('bcrypt');
const { User } = require('../db/models');
const { DEFAULT_MOCK_ADMIN_EMAIL } = require('./protectedUsers');

/**
 * Гарантирует системного мок-админа в текущей БД (локальной или Neon).
 * Вызывается при старте сервера.
 */
async function ensureMockAdmin() {
  const email = (
    process.env.ADMIN_USER_EMAIL ||
    process.env.ADMIN_EMAIL ||
    DEFAULT_MOCK_ADMIN_EMAIL
  )
    .toLowerCase()
    .trim();
  const username = (
    process.env.ADMIN_USER_USERNAME || 'admin'
  ).toLowerCase();
  const name = process.env.ADMIN_USER_NAME || 'Администратор';
  const plainPassword =
    process.env.ADMIN_USER_PASSWORD ||
    process.env.ADMIN_PASSWORD ||
    'Admin123!';

  const existing = await User.findOne({
    where: { email },
  });

  if (existing) {
    const updates = {};
    if (existing.role !== 'admin') updates.role = 'admin';
    if (!existing.password) {
      updates.password = await bcrypt.hash(plainPassword, 10);
    }
    if (Object.keys(updates).length > 0) {
      await existing.update(updates);
      console.log(`[ensureMockAdmin] обновлён: ${email}`);
    }
    return existing;
  }

  const password = await bcrypt.hash(plainPassword, 10);
  const created = await User.create({
    name,
    email,
    username,
    password,
    role: 'admin',
  });
  console.log(`[ensureMockAdmin] создан: ${email}`);
  return created;
}

module.exports = { ensureMockAdmin };
