-- CreateTable
CREATE TABLE "schedule_substitutions" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "lesson_number" INTEGER NOT NULL,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "subject_id" TEXT,
    "teacher_id" TEXT,
    "room" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_substitutions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "schedule_substitutions_group_id_date_lesson_number_key" ON "schedule_substitutions"("group_id", "date", "lesson_number");

-- AddForeignKey
ALTER TABLE "schedule_substitutions" ADD CONSTRAINT "schedule_substitutions_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_substitutions" ADD CONSTRAINT "schedule_substitutions_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_substitutions" ADD CONSTRAINT "schedule_substitutions_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
