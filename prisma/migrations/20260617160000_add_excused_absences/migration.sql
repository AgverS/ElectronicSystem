-- CreateTable
CREATE TABLE "excused_absences" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "excused_absences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "excused_absences_student_id_date_key" ON "excused_absences"("student_id", "date");

-- AddForeignKey
ALTER TABLE "excused_absences" ADD CONSTRAINT "excused_absences_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
