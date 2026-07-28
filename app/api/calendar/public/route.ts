import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildIcs } from "@/lib/calendar/ics";
import {
  computeGroupEvents,
  computeTeacherEvents,
  computeRoomEvents,
  type BaseEntryInput,
} from "@/lib/calendar/schedule-events";
import {
  baseInclude,
  resolveRange,
  loadBellContext,
  toSubInput,
  icsHeaders,
} from "@/lib/calendar/feed";

export const dynamic = "force-dynamic";

// Публичная подписка на расписание группы / преподавателя / кабинета.
// Ссылка не привязана к пользователю — её можно открыть из публичного расписания.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const groupId = sp.get("group");
  const teacherId = sp.get("teacher");
  const room = sp.get("room");

  const range = await resolveRange();
  const bell = await loadBellContext(range);
  const domain = req.nextUrl.host;

  let calendarName = "Расписание";
  let events;

  if (groupId) {
    const [group, base, subsRaw] = await Promise.all([
      prisma.group.findUnique({
        where: { id: groupId },
        select: { name: true },
      }),
      prisma.scheduleEntry.findMany({
        where: { groupId },
        include: baseInclude,
      }),
      prisma.scheduleSubstitution.findMany({
        where: { groupId, date: { gte: range.start, lte: range.end } },
        include: baseInclude,
      }),
    ]);
    if (!group) return new NextResponse("Not found", { status: 404 });
    calendarName = `Расписание ${group.name}`.trim();
    events = computeGroupEvents({
      base: base as BaseEntryInput[],
      subs: subsRaw.map(toSubInput),
      range,
      bell,
    });
  } else if (teacherId) {
    const teacher = await prisma.user.findUnique({
      where: { id: teacherId },
      select: { name: true },
    });
    if (!teacher) return new NextResponse("Not found", { status: 404 });
    const base = await prisma.scheduleEntry.findMany({
      where: { teacherId },
      include: baseInclude,
    });
    const groupIds = [...new Set(base.map((b) => b.groupId))];
    const subsRaw = await prisma.scheduleSubstitution.findMany({
      where: {
        date: { gte: range.start, lte: range.end },
        OR: [
          { teacherId },
          ...(groupIds.length ? [{ groupId: { in: groupIds } }] : []),
        ],
      },
      include: baseInclude,
    });
    calendarName = `Расписание — ${teacher.name}`;
    events = computeTeacherEvents({
      teacherId,
      base: base as BaseEntryInput[],
      subs: subsRaw.map(toSubInput),
      range,
      bell,
    });
  } else if (room) {
    const base = await prisma.scheduleEntry.findMany({
      where: { room },
      include: baseInclude,
    });
    const groupIds = [...new Set(base.map((b) => b.groupId))];
    const subsRaw = await prisma.scheduleSubstitution.findMany({
      where: {
        date: { gte: range.start, lte: range.end },
        OR: [
          { room },
          ...(groupIds.length ? [{ groupId: { in: groupIds } }] : []),
        ],
      },
      include: baseInclude,
    });
    calendarName = `Расписание — кабинет ${room}`;
    events = computeRoomEvents({
      room,
      base: base as BaseEntryInput[],
      subs: subsRaw.map(toSubInput),
      range,
      bell,
    });
  } else {
    return new NextResponse("Missing filter", { status: 400 });
  }

  const ics = buildIcs({ calendarName, events, domain });
  return new NextResponse(ics, { headers: icsHeaders() });
}
