'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();

    if (tables.includes('RoomMembers')) {
      return;
    }

    await queryInterface.createTable('RoomMembers', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },

      roomId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Rooms',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },

      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },

      role: {
        type: Sequelize.ENUM('student', 'teacher', 'admin', 'user'),
        allowNull: false,
        defaultValue: 'user',
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

    await queryInterface.addConstraint('RoomMembers', {
      fields: ['roomId', 'userId'],
      type: 'unique',
      name: 'room_members_room_id_user_id_unique',
    });
  },

  async down(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();

    if (tables.includes('RoomMembers')) {
      await queryInterface.dropTable('RoomMembers');
    }

    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_RoomMembers_role";',
    );
  },
};
