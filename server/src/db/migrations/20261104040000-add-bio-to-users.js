'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    let table;
    try {
      table = await queryInterface.describeTable('Users');
    } catch {
      return;
    }

    if (!table.bio) {
      await queryInterface.addColumn('Users', 'bio', {
        type: Sequelize.STRING(500),
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('Users');

    if (table.bio) {
      await queryInterface.removeColumn('Users', 'bio');
    }
  },
};
