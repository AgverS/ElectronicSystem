-- AlterTable: план «всего лабораторных работ» по группе+предмету
ALTER TABLE "assignments" ADD COLUMN "labs_total" INTEGER;

-- AlterTable: срок сдачи лабы (NULL = дата урока + 14 дней по умолчанию)
ALTER TABLE "lessons" ADD COLUMN "deadline" DATE;
