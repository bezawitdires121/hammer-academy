-- CreateEnum
CREATE TYPE "EmployeeRole" AS ENUM ('TEACHER', 'CLEANER', 'SECURITY', 'SECRETARY', 'LIBRARIAN', 'HEALTH', 'CLUB_LEADER', 'OTHER');

-- AlterTable
ALTER TABLE "teacher_applications" ADD COLUMN     "requestedRole" "EmployeeRole" NOT NULL DEFAULT 'TEACHER';

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "EmployeeRole" NOT NULL,
    "userId" TEXT,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employees_userId_key" ON "employees"("userId");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
