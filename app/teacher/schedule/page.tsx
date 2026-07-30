"use client";

import { PersonalScheduleClient } from "@/components/schedule/personal-schedule-client";
import { PageLoading } from "@/components/ui/page-state";
import { loadBellContext } from "@/lib/bells-data";
import { useDemoUser } from "@/lib/demo-session";
import { useDemoData } from "@/lib/use-demo-data";

export default function TeacherSchedulePage() {
  const user = useDemoUser();
  const { data: bellSchedule, loading } = useDemoData(["bells"], loadBellContext);

  if (loading || !user || !bellSchedule) return <PageLoading />;

  return (
    <PersonalScheduleClient
      own={{ kind: "teacher", id: user.id, label: user.name }}
      userId={user.id}
      userRole="TEACHER"
      bellSchedule={bellSchedule}
    />
  );
}
