-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "clubType" TEXT;

-- AlterTable
ALTER TABLE "teacher_applications" ADD COLUMN     "clubName" TEXT,
ADD COLUMN     "clubType" TEXT,
ADD COLUMN     "passwordHash" TEXT;
