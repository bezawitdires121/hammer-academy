-- Add semester lock flag.
-- The column already exists in the database.
-- This migration records that schema change safely.

ALTER TABLE "semesters"
ADD COLUMN IF NOT EXISTS "isLocked" BOOLEAN NOT NULL DEFAULT false;