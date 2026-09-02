/*
  Warnings:

  - The values [CLUB_LEADER] on the enum `EmployeeRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "EmployeeRole_new" AS ENUM ('TEACHER', 'CLEANER', 'SECURITY', 'SECRETARY', 'LIBRARIAN', 'HEALTH', 'OTHER');
ALTER TABLE "public"."teacher_applications" ALTER COLUMN "requestedRole" DROP DEFAULT;
ALTER TABLE "teacher_applications" ALTER COLUMN "requestedRole" TYPE "EmployeeRole_new" USING ("requestedRole"::text::"EmployeeRole_new");
ALTER TABLE "employees" ALTER COLUMN "role" TYPE "EmployeeRole_new" USING ("role"::text::"EmployeeRole_new");
ALTER TYPE "EmployeeRole" RENAME TO "EmployeeRole_old";
ALTER TYPE "EmployeeRole_new" RENAME TO "EmployeeRole";
DROP TYPE "public"."EmployeeRole_old";
ALTER TABLE "teacher_applications" ALTER COLUMN "requestedRole" SET DEFAULT 'TEACHER';
COMMIT;
