import { CreateSemesterDialog } from "@/components/admin/create-semester-dialog";
import { SemestersTable } from "@/components/admin/semesters-table";

export default async function SemestersPage() {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Семестры</h1>
        <CreateSemesterDialog />
      </div>
      <SemestersTable />
    </div>
  );
}
