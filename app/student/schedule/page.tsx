"use client";

import { PersonalScheduleClient } from "@/components/schedule/personal-schedule-client";
import { PageLoading } from "@/components/ui/page-state";
import { prisma } from "@/lib/prisma";
import { loadBellContext } from "@/lib/bells-data";
import { useDemoUser } from "@/lib/demo-session";
import { useDemoData } from "@/lib/use-demo-data";
import { useT } from "@/lib/i18n/provider";

export default function StudentSchedulePage() {
  const user = useDemoUser();
  const t = useT();

  const { data, loading } = useDemoData(
    ["student-schedule", user?.id, user?.groupId],
    async () => {
      const [group, bellSchedule] = await Promise.all([
        user?.groupId
          ? prisma.group.findUnique({ where: { id: user.groupId }, select: { name: true } })
          : Promise.resolve(null),
        loadBellContext(),
      ]);
      return { group, bellSchedule };
    },
    { enabled: !!user },
  );

  if (loading || !data) return <PageLoading />;

  if (!user?.groupId) {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight">{t("nav.schedule")}</h1>
        <p className="text-muted-foreground">{t("student.noGroup")}</p>
      </div>
    );
  }

  return (
    <PersonalScheduleClient
      own={{ kind: "group", id: user.groupId, label: data.group?.name ?? "" }}
      userId={user.id}
      userRole="STUDENT"
      bellSchedule={data.bellSchedule}
    />
  );
}
