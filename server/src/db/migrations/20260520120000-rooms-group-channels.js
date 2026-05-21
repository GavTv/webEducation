'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Rooms');

    if (!table.parentRoomId) {
      await queryInterface.addColumn('Rooms', 'parentRoomId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Rooms',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });
    }

    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = 'enum_Rooms_type' AND e.enumlabel = 'channel'
        ) THEN
          ALTER TYPE "enum_Rooms_type" ADD VALUE 'channel';
        END IF;
      END
      $$;
    `);

    const [groups] = await queryInterface.sequelize.query(`
      SELECT id, "createdBy", color
      FROM "Rooms"
      WHERE "parentRoomId" IS NULL
    `);

    for (const group of groups) {
      const [existing] = await queryInterface.sequelize.query(
        `
        SELECT id FROM "Rooms"
        WHERE "parentRoomId" = :groupId
        LIMIT 1
        `,
        { replacements: { groupId: group.id } },
      );

      if (existing.length > 0) continue;

      const [inserted] = await queryInterface.sequelize.query(
        `
        INSERT INTO "Rooms" (
          title, type, "createdBy", color, "parentRoomId", "createdAt", "updatedAt"
        )
        VALUES (
          'Общий', 'channel', :createdBy, :color, :groupId, NOW(), NOW()
        )
        RETURNING id
        `,
        {
          replacements: {
            createdBy: group.createdBy,
            color: group.color || 'purple',
            groupId: group.id,
          },
        },
      );

      const channelId = inserted[0]?.id;
      if (!channelId) continue;

      await queryInterface.sequelize.query(
        `
        UPDATE "Messages"
        SET "roomId" = :channelId
        WHERE "roomId" = :groupId
        `,
        { replacements: { channelId, groupId: group.id } },
      );
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('Rooms');
    if (table.parentRoomId) {
      await queryInterface.removeColumn('Rooms', 'parentRoomId');
    }
  },
};
