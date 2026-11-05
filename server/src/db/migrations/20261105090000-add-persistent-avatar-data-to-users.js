'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Users');

    if (!table.avatarData) {
      await queryInterface.addColumn('Users', 'avatarData', {
        type: Sequelize.BLOB,
        allowNull: true,
      });
    }

    if (!table.avatarMimeType) {
      await queryInterface.addColumn('Users', 'avatarMimeType', {
        type: Sequelize.STRING(32),
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('Users');

    if (table.avatarMimeType) {
      await queryInterface.removeColumn('Users', 'avatarMimeType');
    }

    if (table.avatarData) {
      await queryInterface.removeColumn('Users', 'avatarData');
    }
  },
};
