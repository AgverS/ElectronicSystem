/*
  Warnings:

  - You are about to drop the `_UserDepartments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `departments` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_UserDepartments" DROP CONSTRAINT "_UserDepartments_A_fkey";

-- DropForeignKey
ALTER TABLE "_UserDepartments" DROP CONSTRAINT "_UserDepartments_B_fkey";

-- AlterTable
ALTER TABLE "groups" ADD COLUMN     "specialty_id" TEXT;

-- AlterTable
ALTER TABLE "specialties" ADD COLUMN     "letter" TEXT NOT NULL DEFAULT '';

-- DropTable
DROP TABLE "_UserDepartments";

-- DropTable
DROP TABLE "departments";

-- CreateTable
CREATE TABLE "_UserSpecialties" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserSpecialties_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_UserSpecialties_B_index" ON "_UserSpecialties"("B");

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "specialties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserSpecialties" ADD CONSTRAINT "_UserSpecialties_A_fkey" FOREIGN KEY ("A") REFERENCES "specialties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserSpecialties" ADD CONSTRAINT "_UserSpecialties_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
