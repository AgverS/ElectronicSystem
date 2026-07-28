import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/prisma-client";
import { redirect } from "next/navigation";
import { PersonalScheduleClient } from "@/components/schedule/personal-schedule-client";
import { toISODate } from "@/lib/week";

export default async function TeacherSchedulePage() {
  const user = await requireRole(Role.TEACHER, Role.ADMIN);
  if (!user) redirect("/login");

  const [permanentBells, overrides] = await Promise.all([
    prisma.bellTime.findMany(),
    prisma.bellOverride.findMany({ include: { slots: true } }),
  ]);

  return (
    <PersonalScheduleClient
      own={{ kind: "teacher", id: user.id, label: user.name }}
      userId={user.id}
      userRole="TEACHER"
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
