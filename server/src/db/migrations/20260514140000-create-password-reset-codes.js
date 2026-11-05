'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const tableNames = tables.map((t) =>
      typeof t === 'string' ? t : t.tableName || t.name,
    );

    if (!tableNames.includes('PasswordResetCodes')) {
      await queryInterface.createTable('PasswordResetCodes', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        email: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        codeHash: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        expiresAt: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('now'),
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('now'),
        },
      });
    }

    const indexes = await queryInterface.showIndex('PasswordResetCodes');
    const hasEmailIdx = indexes.some(
      (idx) => idx.name === 'PasswordResetCodes_email_idx',
    );
    if (!hasEmailIdx) {
      await queryInterface.addIndex('PasswordResetCodes', ['email'], {
        name: 'PasswordResetCodes_email_idx',
      });
    }
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    const tableNames = tables.map((t) =>
      typeof t === 'string' ? t : t.tableName || t.name,
    );
    if (tableNames.includes('PasswordResetCodes')) {
      await queryInterface.dropTable('PasswordResetCodes');
    }
  },
};
