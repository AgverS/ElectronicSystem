-- DropForeignKey
ALTER TABLE "assignments" DROP CONSTRAINT "assignments_teacher_id_fkey";

-- DropIndex
DROP INDEX "assignments_teacher_id_group_id_subject_id_key";

-- AlterTable
ALTER TABLE "assignments" DROP COLUMN "teacher_id";

-- CreateTable
CREATE TABLE "extra_lessons" (
    "id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "lesson_number" INTEGER NOT NULL,
    "room" TEXT NOT NULL,
    "comment" TEXT,
    "group_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extra_lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extra_lesson_rsvps" (
    "id" TEXT NOT NULL,
    "extra_lesson_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extra_lesson_rsvps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TeacherAssignments" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TeacherAssignments_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "extra_lessons_teacher_id_date_lesson_number_key" ON "extra_lessons"("teacher_id", "date", "lesson_number");

-- CreateIndex
CREATE UNIQUE INDEX "extra_lesson_rsvps_extra_lesson_id_student_id_key" ON "extra_lesson_rsvps"("extra_lesson_id", "student_id");

-- CreateIndex
CREATE INDEX "_TeacherAssignments_B_index" ON "_TeacherAssignments"("B");

-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "accounts"("user_id");

-- CreateIndex
CREATE INDEX "assignments_group_id_idx" ON "assignments"("group_id");

-- CreateIndex
CREATE INDEX "assignments_subject_id_idx" ON "assignments"("subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "assignments_group_id_subject_id_key" ON "assignments"("group_id", "subject_id");

-- CreateIndex
CREATE INDEX "grades_student_id_idx" ON "grades"("student_id");

-- CreateIndex
CREATE INDEX "groups_curator_id_idx" ON "groups"("curator_id");

-- CreateIndex
CREATE INDEX "groups_specialty_id_idx" ON "groups"("specialty_id");

-- CreateIndex
CREATE INDEX "lessons_assignment_id_date_idx" ON "lessons"("assignment_id", "date");

-- CreateIndex
CREATE INDEX "lessons_semester_id_idx" ON "lessons"("semester_id");

-- CreateIndex
CREATE INDEX "push_subscriptions_filter_key_idx" ON "push_subscriptions"("filter_key");

-- CreateIndex
CREATE INDEX "schedule_entries_teacher_id_idx" ON "schedule_entries"("teacher_id");

-- CreateIndex
CREATE INDEX "schedule_substitutions_teacher_id_idx" ON "schedule_substitutions"("teacher_id");

-- CreateIndex
CREATE INDEX "schedule_substitutions_date_idx" ON "schedule_substitutions"("date");

-- CreateIndex
CREATE INDEX "semesters_is_current_idx" ON "semesters"("is_current");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_group_id_idx" ON "users"("group_id");

-- CreateIndex
CREATE INDEX "users_is_master_idx" ON "users"("is_master");

-- AddForeignKey
ALTER TABLE "extra_lessons" ADD CONSTRAINT "extra_lessons_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extra_lessons" ADD CONSTRAINT "extra_lessons_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extra_lesson_rsvps" ADD CONSTRAINT "extra_lesson_rsvps_extra_lesson_id_fkey" FOREIGN KEY ("extra_lesson_id") REFERENCES "extra_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extra_lesson_rsvps" ADD CONSTRAINT "extra_lesson_rsvps_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TeacherAssignments" ADD CONSTRAINT "_TeacherAssignments_A_fkey" FOREIGN KEY ("A") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TeacherAssignments" ADD CONSTRAINT "_TeacherAssignments_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

