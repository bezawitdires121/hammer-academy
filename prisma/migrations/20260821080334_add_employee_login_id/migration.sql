/*
  Warnings:

  - A unique constraint covering the columns `[employeeLoginId]` on the table `employees` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "employeeLoginId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "employees_employeeLoginId_key" ON "employees"("employeeLoginId");
