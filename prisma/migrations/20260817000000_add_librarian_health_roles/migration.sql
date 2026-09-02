-- Add LIBRARIAN and HEALTH enum values to Role
-- NOTE: This migration file was added locally. Apply it with `npx prisma migrate deploy` or `npx prisma migrate dev` when your DB is reachable.

ALTER TYPE "Role" ADD VALUE 'LIBRARIAN';
ALTER TYPE "Role" ADD VALUE 'HEALTH';
