import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

  const where: Record<string, unknown> = {};
  if (groupId) where.groupId = groupId;
  if (teacherId) where.teacherId = teacherId;
  if (room) where.room = room;

  const entries = await prisma.scheduleEntry.findMany({
    where,
    include,
    orderBy: [{ dayOfWeek: "asc" }, { lessonNumber: "asc" }],
  });

  return NextResponse.json(entries);
}
