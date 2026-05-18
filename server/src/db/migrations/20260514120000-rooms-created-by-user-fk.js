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

    const [existing] = await queryInterface.sequelize.query(`
      SELECT 1 FROM pg_constraint WHERE conname = 'Rooms_createdBy_User_fk' LIMIT 1;
    `);

    if (!existing.length) {
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
    }
  },

  async down(queryInterface) {
    const [existing] = await queryInterface.sequelize.query(`
      SELECT 1 FROM pg_constraint WHERE conname = 'Rooms_createdBy_User_fk' LIMIT 1;
    `);
    if (existing.length) {
      await queryInterface.removeConstraint('Rooms', 'Rooms_createdBy_User_fk');
    }
  },
};
