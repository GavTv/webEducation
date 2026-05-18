'use strict';

const bcrypt = require('bcrypt');

module.exports = {
  async up(queryInterface) {
    const existingAdmin = await queryInterface.sequelize.query(
      'SELECT id FROM "Users" WHERE email = :email LIMIT 1;',
      {
        replacements: {
          email: 'admin@localhost',
        },
        type: queryInterface.sequelize.QueryTypes.SELECT,
      },
    );

    if (existingAdmin.length > 0) {
      console.log('Admin already exists, skip seed');
      return;
    }

    const hashedPassword = await bcrypt.hash('admin', 10);

    await queryInterface.bulkInsert('Users', [
      {
        name: 'Admin',
        email: 'admin@localhost',
        username: 'admin',
        password: hashedPassword,
        avatarUrl: null,
        google_sub: null,
        github_sub: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('Users', {
      email: 'admin@localhost',
    });
  },
};
