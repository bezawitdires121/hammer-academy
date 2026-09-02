/*
  Warnings:

  - You are about to drop the column `term` on the `exams` table. All the data in the column will be lost.
  - Added the required column `semesterId` to the `exams` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "exams" DROP CONSTRAINT "exams_schoolYearId_fkey";

-- AlterTable
ALTER TABLE "exams" DROP COLUMN "term",
ADD COLUMN     "semesterId" TEXT NOT NULL,
ALTER COLUMN "schoolYearId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "semesters" (
    "id" TEXT NOT NULL,
    "schoolYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "semesters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "semesters_schoolYearId_number_key" ON "semesters"("schoolYearId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "semesters_schoolYearId_name_key" ON "semesters"("schoolYearId", "name");

-- AddForeignKey
ALTER TABLE "semesters" ADD CONSTRAINT "semesters_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "school_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "semesters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "school_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;
