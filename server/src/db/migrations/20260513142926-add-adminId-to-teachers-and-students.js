'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Teachers', 'adminId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Admins',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addColumn('Students', 'adminId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Admins',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Students', 'adminId');
    await queryInterface.removeColumn('Teachers', 'adminId');
  },
};
