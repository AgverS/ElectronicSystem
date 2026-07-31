-- CreateEnum
CREATE TYPE "RecordKind" AS ENUM ('REWARD', 'PENALTY');

-- CreateTable
CREATE TABLE "student_records" (
    "id" TEXT NOT NULL,
    "kind" "RecordKind" NOT NULL,
    "number" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "issued_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "record_attachments" (
    "id" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "record_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_records_student_id_idx" ON "student_records"("student_id");

-- CreateIndex
CREATE INDEX "student_records_kind_idx" ON "student_records"("kind");

-- CreateIndex
CREATE INDEX "record_attachments_record_id_idx" ON "record_attachments"("record_id");

-- AddForeignKey
ALTER TABLE "student_records" ADD CONSTRAINT "student_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_records" ADD CONSTRAINT "student_records_issued_by_id_fkey" FOREIGN KEY ("issued_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_attachments" ADD CONSTRAINT "record_attachments_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "student_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
