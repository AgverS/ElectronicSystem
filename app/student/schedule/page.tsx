import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/prisma-client";
import { redirect } from "next/navigation";
import { PersonalScheduleClient } from "@/components/schedule/personal-schedule-client";
import { toISODate } from "@/lib/week";

export default async function StudentSchedulePage() {
  const user = await requireRole(Role.STUDENT, Role.ADMIN);
  if (!user) redirect("/login");

  if (!user.groupId) {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Расписание</h1>
        <p className="text-muted-foreground">
          Вы не добавлены ни в одну группу.
        </p>
      </div>
    );
  }

  const [group, permanentBells, overrides] = await Promise.all([
    prisma.group.findUnique({
      where: { id: user.groupId },
      select: { name: true },
    }),
    prisma.bellTime.findMany(),
    prisma.bellOverride.findMany({ include: { slots: true } }),
  ]);

  return (
    <PersonalScheduleClient
      own={{ kind: "group", id: user.groupId, label: group?.name ?? "" }}
      userId={user.id}
      userRole="STUDENT"
      vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""}
      bellSchedule={{
        permanent: permanentBells.map((b) => ({
          dayGroup: b.dayGroup,
          number: b.number,
          startTime: b.startTime,
          endTime: b.endTime,
        })),
        overrides: overrides.map((o) => ({
          startDate: toISODate(o.startDate),
          endDate: toISODate(o.endDate),
          slots: o.slots.map((s) => ({
            number: s.number,
            startTime: s.startTime,
            endTime: s.endTime,
          })),
        })),
      }}
    />
  );
}
