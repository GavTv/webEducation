'use strict';
const bcrypt = require('bcrypt');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const name = process.env.ADMIN_NAME || 'Admin';
    const email = process.env.ADMIN_EMAIL || 'admin@localhost';
    const password = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);

    await queryInterface.bulkInsert(
      'Admins',
      [
        {
          name: name,
          email: email,
          password: password,
        },
      ],
      {},
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Admins', null, {});
  },
};



http%localhost/student/admin