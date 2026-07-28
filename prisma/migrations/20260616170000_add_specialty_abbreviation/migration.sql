-- AlterTable
ALTER TABLE "specialties" ADD COLUMN IF NOT EXISTS "abbreviation" TEXT NOT NULL DEFAULT '';
