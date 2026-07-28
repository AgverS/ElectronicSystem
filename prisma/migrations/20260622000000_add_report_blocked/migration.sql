-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "report_blocked" BOOLEAN NOT NULL DEFAULT false;
