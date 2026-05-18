'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Users');
    if (!table.github_sub) {
      await queryInterface.addColumn('Users', 'github_sub', {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('Users');
    if (table.github_sub) {
      await queryInterface.removeColumn('Users', 'github_sub');
    }
  },
};
