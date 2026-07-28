-- AlterTable
ALTER TABLE "lessons" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'лекция';

-- AlterTable
ALTER TABLE "semesters" ADD COLUMN     "is_current" BOOLEAN NOT NULL DEFAULT false;
