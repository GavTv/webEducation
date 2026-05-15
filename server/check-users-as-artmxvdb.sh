#!/bin/bash

set -e

psql -U artmxvdb -d webeducation <<'SQL'
SELECT id, name, email, username, "avatarUrl", "createdAt"
FROM "Users";
SQL
