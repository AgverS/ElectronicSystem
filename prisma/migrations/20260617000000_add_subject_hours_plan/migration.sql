-- CreateTable
CREATE TABLE "subject_hours_plans" (
    "id" TEXT NOT NULL,
    "planned_hours" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "semester_id" TEXT NOT NULL,

    CONSTRAINT "subject_hours_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subject_hours_plans_assignment_id_semester_id_key" ON "subject_hours_plans"("assignment_id", "semester_id");

-- AddForeignKey
ALTER TABLE "subject_hours_plans" ADD CONSTRAINT "subject_hours_plans_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_hours_plans" ADD CONSTRAINT "subject_hours_plans_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
