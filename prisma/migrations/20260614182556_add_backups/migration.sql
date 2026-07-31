-- CreateTable
-- IF NOT EXISTS: a prior failed run of this migration already created the table
-- in some environments, so make re-application safe.
CREATE TABLE IF NOT EXISTS "backup_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "interval_hours" INTEGER NOT NULL DEFAULT 24,
    "keep_count" INTEGER NOT NULL DEFAULT 10,
    "last_backup_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backup_settings_pkey" PRIMARY KEY ("id")
);

-- RenameIndex
-- Guarded: the index may already be renamed by an earlier migration (this rename
-- is duplicated), and Postgres truncates the created name to "..._subgroup_ke".
-- Only rename when the old name is still present.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class
    WHERE relname = 'schedule_entries_group_id_day_of_week_lesson_number_subgroup_ke'
  ) THEN
    ALTER INDEX "schedule_entries_group_id_day_of_week_lesson_number_subgroup_ke"
      RENAME TO "schedule_entries_group_id_day_of_week_lesson_number_subgrou_key";
  END IF;
END $$;
