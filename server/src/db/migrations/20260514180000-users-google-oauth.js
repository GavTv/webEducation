'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Users');

    await queryInterface.changeColumn('Users', 'password', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    if (!table.google_sub) {
      await queryInterface.addColumn('Users', 'google_sub', {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Users');
    if (table.google_sub) {
      await queryInterface.removeColumn('Users', 'google_sub');
    }
    await queryInterface.changeColumn('Users', 'password', {
      type: Sequelize.STRING,
      allowNull: false,
    });
  },
};
