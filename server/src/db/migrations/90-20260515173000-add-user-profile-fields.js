'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    let table;
    try {
      table = await queryInterface.describeTable('Users');
    } catch {
      return;
    }

    if (!table.username) {
      await queryInterface.addColumn('Users', 'username', {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      });
    }

    if (!table.avatarUrl) {
      await queryInterface.addColumn('Users', 'avatarUrl', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('Users');

    if (table.avatarUrl) {
      await queryInterface.removeColumn('Users', 'avatarUrl');
    }

    if (table.username) {
      await queryInterface.removeColumn('Users', 'username');
    }
  },
};
