'use strict';

const bcrypt = require('bcrypt');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const email = (
      process.env.ADMIN_USER_EMAIL ||
      process.env.ADMIN_EMAIL ||
      'taras@educhat.local'
    )
      .toLowerCase()
      .trim();
    const password = await bcrypt.hash(
      process.env.ADMIN_USER_PASSWORD ||
        process.env.ADMIN_PASSWORD ||
        'Admin123!',
      10,
    );
    const name = process.env.ADMIN_USER_NAME || 'Администратор';
    const username = (
      process.env.ADMIN_USER_USERNAME || 'admin'
    ).toLowerCase();

    const existing = await queryInterface.sequelize.query(
      `SELECT id, email FROM "Users"
       WHERE email = :email OR username = :username
       LIMIT 1`,
      {
        replacements: { email, username },
        type: queryInterface.sequelize.QueryTypes.SELECT,
      },
    );

    if (existing.length > 0) {
      await queryInterface.sequelize.query(
        `UPDATE "Users" SET role = 'admin', "updatedAt" = NOW() WHERE id = :id`,
        { replacements: { id: existing[0].id } },
      );
      console.log(
        `Admin user seed skipped: already exists (${existing[0].email})`,
      );
      return;
    }

    const now = new Date();
    await queryInterface.bulkInsert('Users', [
      {
        name,
        email,
        username,
        password,
        role: 'admin',
        createdAt: now,
        updatedAt: now,
      },
    ]);
  },

  async down(queryInterface) {
    const email = (
      process.env.ADMIN_USER_EMAIL ||
      process.env.ADMIN_EMAIL ||
      'admin@educhat.local'
    )
      .toLowerCase()
      .trim();
    await queryInterface.bulkDelete('Users', { email });
  },
};
