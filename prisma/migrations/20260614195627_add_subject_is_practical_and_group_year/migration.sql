-- AlterTable
ALTER TABLE "groups" ADD COLUMN     "year" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "subjects" ADD COLUMN     "is_practical" BOOLEAN NOT NULL DEFAULT false;
