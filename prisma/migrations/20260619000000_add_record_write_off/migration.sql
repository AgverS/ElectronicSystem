-- Досрочное списание взысканий: запись остаётся в истории, но помечается списанной.
ALTER TABLE "student_records" ADD COLUMN "written_off_at" DATE;
ALTER TABLE "student_records" ADD COLUMN "written_off_by_id" TEXT;
