'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Сообщения в «осиротевших» комнатах (createdBy не из Users)
    await queryInterface.sequelize.query(`
      DELETE FROM "Messages"
      WHERE "roomId" IN (
        SELECT r.id FROM "Rooms" r
        WHERE NOT EXISTS (SELECT 1 FROM "Users" u WHERE u.id = r."createdBy")
      );
    `);

    await queryInterface.sequelize.query(`
      DELETE FROM "Rooms" r
      WHERE NOT EXISTS (SELECT 1 FROM "Users" u WHERE u.id = r."createdBy");
    `);

    await queryInterface.addConstraint('Rooms', {
      fields: ['createdBy'],
      type: 'foreign key',
      name: 'Rooms_createdBy_User_fk',
      references: {
        table: 'Users',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('Rooms', 'Rooms_createdBy_User_fk');
  },
};
