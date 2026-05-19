#!/bin/bash

set -e

psql -U postgres -d webeducation <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Rooms'
      AND column_name = 'description'
  ) THEN
    ALTER TABLE "Rooms"
    ADD COLUMN "description" TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Rooms'
      AND column_name = 'joinPasswordHash'
  ) THEN
    ALTER TABLE "Rooms"
    ADD COLUMN "joinPasswordHash" VARCHAR(255);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Rooms'
      AND column_name = 'color'
  ) THEN
    ALTER TABLE "Rooms"
    ADD COLUMN "color" VARCHAR(255);
  END IF;
END $$;

UPDATE "Rooms"
SET "description" = COALESCE("description", 'Учебный чат'),
    "color" = COALESCE("color", '#7c3aed');

GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES ON TABLE "Rooms" TO artmxvdb;
SQL

echo "Rooms columns fixed"
