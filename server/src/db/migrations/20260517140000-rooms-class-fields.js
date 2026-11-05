'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Rooms');

    if (!table.description) {
      await queryInterface.addColumn('Rooms', 'description', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
    if (!table.joinPasswordHash) {
      await queryInterface.addColumn('Rooms', 'joinPasswordHash', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
    if (!table.color) {
      await queryInterface.addColumn('Rooms', 'color', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'purple',
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('Rooms');
    if (table.color) await queryInterface.removeColumn('Rooms', 'color');
    if (table.joinPasswordHash) {
      await queryInterface.removeColumn('Rooms', 'joinPasswordHash');
    }
    if (table.description) {
      await queryInterface.removeColumn('Rooms', 'description');
    }
  },
};
