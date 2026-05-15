#!/bin/bash

set -e

node <<'NODE'
const fs = require('fs');

const envFile = '.env';

if (!fs.existsSync(envFile)) {
  console.log('Файл .env не найден');
  process.exit(1);
}

let text = fs.readFileSync(envFile, 'utf8');

text = text.replace(
  /DB=postgres:\/\/postgres:([^@]+)@localhost:5432\/webeducation/g,
  'DB=postgres://artmxvdb:$1@localhost:5432/webeducation',
);

text = text.replace(
  /DATABASE_URL=postgres:\/\/postgres:([^@]+)@localhost:5432\/webeducation/g,
  'DATABASE_URL=postgres://artmxvdb:$1@localhost:5432/webeducation',
);

fs.writeFileSync(envFile, text);

console.log('Готово: user в .env заменён на artmxvdb');
NODE
