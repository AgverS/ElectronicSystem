-- AlterTable
ALTER TABLE "schedule_substitutions" ADD COLUMN "subgroup" TEXT NOT NULL DEFAULT '';

-- DropIndex
DROP INDEX "schedule_substitutions_group_id_date_lesson_number_key";

-- CreateIndex
CREATE UNIQUE INDEX "schedule_substitutions_group_id_date_lesson_number_subgroup_key" ON "schedule_substitutions"("group_id", "date", "lesson_number", "subgroup");
