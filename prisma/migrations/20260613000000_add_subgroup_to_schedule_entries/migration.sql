-- AlterTable
ALTER TABLE "schedule_entries" ADD COLUMN "subgroup" TEXT NOT NULL DEFAULT '';

-- DropIndex
DROP INDEX "schedule_entries_group_id_day_of_week_lesson_number_key";

-- CreateIndex
CREATE UNIQUE INDEX "schedule_entries_group_id_day_of_week_lesson_number_subgroup_key" ON "schedule_entries"("group_id", "day_of_week", "lesson_number", "subgroup");
