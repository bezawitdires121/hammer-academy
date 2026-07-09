/*
  Warnings:

  - You are about to drop the column `examId` on the `results` table. All the data in the column will be lost.
  - You are about to drop the column `isLocked` on the `results` table. All the data in the column will be lost.
  - You are about to drop the column `publishedAt` on the `results` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `results` table. All the data in the column will be lost.
  - You are about to drop the column `studentId` on the `results` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[resultCardId,subjectId]` on the table `results` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `resultCardId` to the `results` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "results" DROP CONSTRAINT "results_examId_fkey";

-- DropForeignKey
ALTER TABLE "results" DROP CONSTRAINT "results_studentId_fkey";

-- DropIndex
DROP INDEX "results_studentId_subjectId_examId_key";

-- AlterTable
ALTER TABLE "results" DROP COLUMN "examId",
DROP COLUMN "isLocked",
DROP COLUMN "publishedAt",
DROP COLUMN "status",
DROP COLUMN "studentId",
ADD COLUMN     "resultCardId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "result_cards" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "status" "ResultStatus" NOT NULL DEFAULT 'DRAFT',
    "remarks" TEXT,
    "publishedAt" TIMESTAMP(3),
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "result_cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "result_cards_studentId_examId_key" ON "result_cards"("studentId", "examId");

-- CreateIndex
CREATE UNIQUE INDEX "results_resultCardId_subjectId_key" ON "results"("resultCardId", "subjectId");

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_resultCardId_fkey" FOREIGN KEY ("resultCardId") REFERENCES "result_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result_cards" ADD CONSTRAINT "result_cards_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result_cards" ADD CONSTRAINT "result_cards_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
