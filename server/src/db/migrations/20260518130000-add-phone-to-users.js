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

    if (!table.phone) {
      await queryInterface.addColumn('Users', 'phone', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('Users');

    if (table.phone) {
      await queryInterface.removeColumn('Users', 'phone');
    }
  },
};
