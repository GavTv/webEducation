#!/bin/bash

set -e

psql -U postgres -d webeducation <<'SQL'
GRANT CONNECT ON DATABASE webeducation TO artmxvdb;

GRANT USAGE ON SCHEMA public TO artmxvdb;
GRANT CREATE ON SCHEMA public TO artmxvdb;
GRANT ALL PRIVILEGES ON SCHEMA public TO artmxvdb;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO artmxvdb;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO artmxvdb;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO artmxvdb;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO artmxvdb;
SQL

echo "Права на schema public выданы пользователю artmxvdb"
