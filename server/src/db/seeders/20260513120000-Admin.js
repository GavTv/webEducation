'use strict';

const bcrypt = require('bcrypt');

module.exports = {
  async up(queryInterface) {
    const email = 'admin@localhost';
    const username = 'admin_local';

    const existing = await queryInterface.sequelize.query(
      `SELECT id, email FROM "Users"
       WHERE email = :email OR username = :username
       LIMIT 1;`,
      {
        replacements: { email, username },
        type: queryInterface.sequelize.QueryTypes.SELECT,
      },
    );

    if (existing.length > 0) {
      await queryInterface.sequelize.query(
        `UPDATE "Users" SET role = 'admin', "updatedAt" = NOW()
         WHERE id = :id AND (role IS NULL OR role <> 'admin');`,
        { replacements: { id: existing[0].id } },
      );
      return;
    }

    const hashedPassword = await bcrypt.hash('admin', 10);
    const now = new Date();

    await queryInterface.bulkInsert('Users', [
      {
        name: 'Admin',
        email,
        username,
        password: hashedPassword,
        role: 'admin',
        avatarUrl: null,
        google_sub: null,
        github_sub: null,
        createdAt: now,
        updatedAt: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('Users', {
      email: 'admin@localhost',
    });
  },
};
