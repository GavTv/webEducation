#!/bin/bash

set -e

node <<'NODE'
const fs = require('fs');

const file = 'src/db/seeders/20260513120000-Admin.js';

if (!fs.existsSync(file)) {
  console.log('Сидер админа не найден:', file);
  process.exit(0);
}

let text = fs.readFileSync(file, 'utf8');

text = text.replace(
  /await queryInterface\.bulkInsert\(\s*['"]Users['"],\s*\[/,
  `const existingAdmin = await queryInterface.sequelize.query(
      'SELECT id FROM "Users" WHERE email = \\'admin@localhost\\' LIMIT 1;',
      {
        type: queryInterface.sequelize.QueryTypes.SELECT,
      },
    );

    if (existingAdmin.length) {
      console.log('Admin already exists, skip seed');
      return;
    }

    await queryInterface.bulkInsert('Users', [`,
);

fs.writeFileSync(file, text);

console.log('Admin seeder fixed');
NODE
