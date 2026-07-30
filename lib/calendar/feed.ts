// Shared helpers for building the timetable's ICS feeds, personal and public.

import { prisma } from "@/lib/prisma";
import { toISODate } from "@/lib/week";
import type { BellContext } from "@/lib/bell-times";
import type { SubInput } from "@/lib/calendar/schedule-events";

export const baseInclude = {
  subject: { select: { name: true } },
  teacher: { select: { id: true, name: true } },
  group: { select: { name: true } },
};

// Date range: the current semester, or else a rolling window around today.
export async function resolveRange(): Promise<{ start: Date; end: Date }> {
  const semester = await prisma.semester.findFirst({
    where: { isCurrent: true },
    select: { startDate: true, endDate: true },
  });
  if (semester) return { start: semester.startDate, end: semester.endDate };
  const now = new Date();
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - 7);
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() + 120);
  return { start, end };
}

export async function loadBellContext(range: {
  start: Date;
  end: Date;
}): Promise<BellContext> {
  const [permanent, overrides] = await Promise.all([
    prisma.bellTime.findMany(),
    prisma.bellOverride.findMany({
      where: { startDate: { lte: range.end }, endDate: { gte: range.start } },
      include: { slots: true },
    }),
  ]);
  return {
    permanent: permanent.map((b) => ({
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
  };
}

export function toSubInput(s: {
  id: string;
  groupId: string;
  date: Date;
  lessonNumber: number;
  subgroup: string;
  cancelled: boolean;
  room: string | null;
  subject: { name: string } | null;
  teacher: { id: string; name: string } | null;
  group: { name: string };
}): SubInput {
  return {
    id: s.id,
    groupId: s.groupId,
    date: toISODate(s.date),
    lessonNumber: s.lessonNumber,
    subgroup: s.subgroup,
    cancelled: s.cancelled,
    room: s.room,
    subject: s.subject,
    teacher: s.teacher,
    group: s.group,
  };
}

export function icsHeaders(): HeadersInit {
  return {
    "Content-Type": "text/calendar; charset=utf-8",
    "Content-Disposition": 'inline; filename="schedule.ics"',
    "Cache-Control": "public, max-age=3600",
  };
}
