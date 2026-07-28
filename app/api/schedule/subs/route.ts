import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fromISODate, getMonday, getWeekDates, toISODate } from "@/lib/week";

const include = {
  subject: { select: { id: true, name: true } },
  teacher: { select: { id: true, name: true } },
  group: { select: { id: true, name: true } },
};

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const groupId = sp.get("groupId");
  const teacherId = sp.get("teacherId");
  const room = sp.get("room");
  const weekParam = sp.get("week");

  const monday = weekParam ? fromISODate(weekParam) : getMonday(new Date());
  const weekDates = getWeekDates(monday);
  const saturday = weekDates[5];

  const where: Record<string, unknown> = {
    date: { gte: monday, lte: saturday },
  };
  if (groupId) where.groupId = groupId;
  if (teacherId) where.teacherId = teacherId;
  if (room) where.room = room;

  const subs = await prisma.scheduleSubstitution.findMany({
    where,
    include,
    orderBy: [{ date: "asc" }, { lessonNumber: "asc" }],
  });

  return NextResponse.json(
    subs.map((s) => ({ ...s, date: toISODate(s.date) })),
  );
}
