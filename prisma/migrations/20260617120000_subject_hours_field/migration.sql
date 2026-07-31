-- AlterTable: hours now live on the subject itself
ALTER TABLE "subjects" ADD COLUMN "hours" INTEGER;

-- DropTable: replaced by subjects.hours. IF EXISTS because the previous
-- migration that created it may not have been applied on every environment.
DROP TABLE IF EXISTS "subject_hours_plans";
