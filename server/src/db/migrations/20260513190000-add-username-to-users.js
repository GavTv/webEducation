'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Users');

    if (!table.username) {
      await queryInterface.addColumn('Users', 'username', {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      });
    }

    await queryInterface.sequelize.query(`
      UPDATE "Users" SET username = 'user_' || id::text WHERE username IS NULL;
    `);

    await queryInterface.changeColumn('Users', 'username', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    });
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('Users');
    if (table.username) {
      await queryInterface.removeColumn('Users', 'username');
    }
  },
};
