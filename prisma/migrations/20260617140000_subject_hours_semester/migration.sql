-- AlterTable: hours are tied to the semester they were set for
ALTER TABLE "subjects" ADD COLUMN "hours_semester_id" TEXT;
