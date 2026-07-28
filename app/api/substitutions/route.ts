import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fromISODate, toISODate } from "@/lib/week";

const include = {
  subject: { select: { id: true, name: true } },
  teacher: { select: { id: true, name: true } },
  group: { select: { id: true, name: true } },
};

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const groupId = sp.get("groupId");
  const weekStart = sp.get("weekStart"); // YYYY-MM-DD (Monday)

  if (!groupId || !weekStart) {
    return NextResponse.json({ error: "groupId and weekStart required" }, { status: 400 });
  }

  const monday = fromISODate(weekStart);
  const saturday = new Date(monday);
  saturday.setDate(saturday.getDate() + 5);

  const subs = await prisma.scheduleSubstitution.findMany({
    where: {
      groupId,
      date: { gte: monday, lte: saturday },
    },
    include,
    orderBy: [{ date: "asc" }, { lessonNumber: "asc" }],
  });

  const result = subs.map((s) => ({
    ...s,
    date: toISODate(s.date),
  }));

  return NextResponse.json(result);
}
