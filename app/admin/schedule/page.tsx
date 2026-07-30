import { AdminScheduleGrid } from "@/components/admin/schedule-grid";
import { translate } from "@/lib/i18n/translate";

export default function SchedulePage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold tracking-tight">{translate("nav.schedule")}</h1>
      <AdminScheduleGrid />
    </div>
  );
}
