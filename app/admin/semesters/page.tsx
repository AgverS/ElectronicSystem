import { CreateSemesterDialog } from "@/components/admin/create-semester-dialog";
import { translate } from "@/lib/i18n/translate";
import { SemestersTable } from "@/components/admin/semesters-table";

export default async function SemestersPage() {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{translate("nav.semesters")}</h1>
        <CreateSemesterDialog />
      </div>
      <SemestersTable />
    </div>
  );
}
