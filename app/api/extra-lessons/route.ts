import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fromISODate, getMonday, getWeekDates, toISODate } from "@/lib/week";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const teacherId = sp.get("teacherId");
  const groupId = sp.get("groupId");
  const weekParam = sp.get("week");
  const userId = sp.get("userId");

  const monday = weekParam ? fromISODate(weekParam) : getMonday(new Date());
  const weekDates = getWeekDates(monday);
  const saturday = weekDates[5];

  const include = {
    teacher: { select: { id: true, name: true } },
    group: { select: { id: true, name: true } },
    rsvps: { select: { studentId: true } },
    _count: { select: { rsvps: true } },
  };

  if (teacherId) {
    const lessons = await prisma.extraLesson.findMany({
      where: { teacherId, date: { gte: monday, lte: saturday } },
      include,
      orderBy: [{ date: "asc" }, { lessonNumber: "asc" }],
    });

    return NextResponse.json(
      lessons.map((l) => ({
        id: l.id,
        teacherId: l.teacherId,
        teacher: l.teacher,
        date: toISODate(l.date),
        lessonNumber: l.lessonNumber,
        room: l.room,
        comment: l.comment,
        groupId: l.groupId,
        group: l.group,
        rsvpCount: l._count.rsvps,
        myRsvp: userId ? l.rsvps.some((r) => r.studentId === userId) : false,
      })),
    );
  }

  if (groupId) {
    // Find all teachers who have any schedule entry for this group (covers both
    // the many-to-many assignments relation and direct teacher_id on schedule entries).
    const entries = await prisma.scheduleEntry.findMany({
      where: { groupId },
      select: { teacherId: true },
      distinct: ["teacherId"],
    });
    const teacherIds = entries.map((e) => e.teacherId);

    const lessons = await prisma.extraLesson.findMany({
      where: {
        date: { gte: monday, lte: saturday },
        OR: [
          { groupId },
          { groupId: null, teacherId: { in: teacherIds } },
        ],
      },
      include,
      orderBy: [{ date: "asc" }, { lessonNumber: "asc" }],
    });

    return NextResponse.json(
      lessons.map((l) => ({
        id: l.id,
        teacherId: l.teacherId,
        teacher: l.teacher,
        date: toISODate(l.date),
        lessonNumber: l.lessonNumber,
        room: l.room,
        comment: l.comment,
        groupId: l.groupId,
        group: l.group,
        rsvpCount: l._count.rsvps,
        myRsvp: userId ? l.rsvps.some((r) => r.studentId === userId) : false,
      })),
    );
  }

  return NextResponse.json([]);
}
