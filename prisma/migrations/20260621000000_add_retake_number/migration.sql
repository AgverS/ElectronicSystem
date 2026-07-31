-- AlterTable
ALTER TABLE "grades" ADD COLUMN "retake_number" INTEGER NOT NULL DEFAULT 0;

-- DropIndex
DROP INDEX IF EXISTS "grades_lesson_id_student_id_key";

-- CreateIndex
CREATE UNIQUE INDEX "grades_lesson_id_student_id_retake_number_key" ON "grades"("lesson_id", "student_id", "retake_number");
