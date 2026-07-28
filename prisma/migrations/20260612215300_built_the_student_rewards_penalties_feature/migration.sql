-- RenameIndex
-- The index created in 20260613000000 is truncated by Postgres to
-- "..._subgroup_ke", while Prisma expects "..._subgrou_key". This rename is
-- duplicated across migrations, so guard it: only rename when the old name is
-- present. This keeps it safe regardless of migration order or re-application.
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
