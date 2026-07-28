import { AdminScheduleGrid } from "@/components/admin/schedule-grid";

export default function SchedulePage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Расписание</h1>
      <AdminScheduleGrid />
    </div>
  );
}
