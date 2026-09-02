-- AlterTable
ALTER TABLE "admins" ADD COLUMN     "signatureUrl" TEXT;

-- AlterTable
ALTER TABLE "teachers" ADD COLUMN     "signatureUrl" TEXT;

-- CreateTable
CREATE TABLE "school_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "schoolName" TEXT NOT NULL DEFAULT 'Hammer Academy',
    "address" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "logoUrl" TEXT,
    "stampUrl" TEXT,
    "directorName" TEXT NOT NULL DEFAULT '',
    "directorSignatureUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_settings_pkey" PRIMARY KEY ("id")
);
