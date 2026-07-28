import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/prisma-client";
import { buildIcs } from "@/lib/calendar/ics";
import {
  computeGroupEvents,
  computeTeacherEvents,
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

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { token: raw } = await params;
  const token = raw.replace(/\.ics$/i, "");
  if (!token) return new NextResponse("Not found", { status: 404 });

  const user = await prisma.user.findUnique({
    where: { calendarToken: token },
    select: { id: true, name: true, role: true, groupId: true },
  });
  if (!user) return new NextResponse("Not found", { status: 404 });

  const range = await resolveRange();
  const bell = await loadBellContext(range);
  const domain = req.nextUrl.host;

  let calendarName = "Расписание";
  let events;

  if (user.role === Role.STUDENT) {
    if (!user.groupId) {
      return new NextResponse(
        buildIcs({ calendarName: "Расписание", events: [], domain }),
        { headers: icsHeaders() },
      );
    }
    const [group, base, subsRaw] = await Promise.all([
      prisma.group.findUnique({
        where: { id: user.groupId },
        select: { name: true },
      }),
      prisma.scheduleEntry.findMany({
        where: { groupId: user.groupId },
        include: baseInclude,
      }),
      prisma.scheduleSubstitution.findMany({
        where: {
          groupId: user.groupId,
          date: { gte: range.start, lte: range.end },
        },
        include: baseInclude,
      }),
    ]);
    calendarName = `Расписание ${group?.name ?? ""}`.trim();
    events = computeGroupEvents({
      base: base as BaseEntryInput[],
      subs: subsRaw.map(toSubInput),
      range,
      bell,
    });
  } else {
    // Преподаватель / админ — его пары.
    const base = await prisma.scheduleEntry.findMany({
      where: { teacherId: user.id },
      include: baseInclude,
    });
    const myGroupIds = [...new Set(base.map((b) => b.groupId))];
    const subsRaw = await prisma.scheduleSubstitution.findMany({
      where: {
        date: { gte: range.start, lte: range.end },
        OR: [
          { teacherId: user.id },
          ...(myGroupIds.length ? [{ groupId: { in: myGroupIds } }] : []),
        ],
      },
      include: baseInclude,
    });
    calendarName = `Расписание — ${user.name}`;
    events = computeTeacherEvents({
      teacherId: user.id,
      base: base as BaseEntryInput[],
      subs: subsRaw.map(toSubInput),
      range,
      bell,
    });
  }

  const ics = buildIcs({ calendarName, events, domain });
  return new NextResponse(ics, { headers: icsHeaders() });
}
