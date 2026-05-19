#!/bin/bash

set -e

echo "========== create migration for Users.role =========="

cat > src/db/migrations/20260518134000-add-role-to-users.js <<'EOF'
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Users');

    if (!table.role) {
      await queryInterface.addColumn('Users', 'role', {
        type: Sequelize.ENUM('student', 'teacher', 'admin'),
        allowNull: false,
        defaultValue: 'student',
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('Users');

    if (table.role) {
      await queryInterface.removeColumn('Users', 'role');
    }

    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_Users_role";',
    );
  },
};
EOF

echo "========== run migration =========="

npx sequelize-cli db:migrate

echo "========== set admin role if admin exists =========="

psql -U artmxvdb -d webeducation <<'SQL'
UPDATE "Users"
SET role = 'admin'
WHERE email = 'admin@localhost';

UPDATE "Users"
SET role = 'student'
WHERE role IS NULL;
SQL

echo "========== check Users =========="

psql -U artmxvdb -d webeducation -c 'SELECT id, name, email, username, role FROM "Users";'

echo "========== DONE =========="
