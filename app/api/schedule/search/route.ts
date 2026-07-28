import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/prisma-client";

// Split into runs of Cyrillic/Latin letters and runs of digits, lowercase.
function tokenize(s: string): string[] {
  return s.toLowerCase().match(/[а-яёa-z]+|\d+/g) ?? [];
}

// All query tokens must appear (as substring) in at least one candidate token.
// This makes "211К" match "К-211" because tokens {211,к} == {к,211}.
function smartMatch(query: string, candidate: string): boolean {
  const qTokens = tokenize(query);
  const cTokens = tokenize(candidate);
  if (qTokens.length === 0 || cTokens.length === 0) return false;
  return qTokens.every((qt) => cTokens.some((ct) => ct.includes(qt)));
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!q) {
    return NextResponse.json({ groups: [], teachers: [], rooms: [] });
  }

  // Fetch all candidates - school datasets are small enough for in-process filtering.
  const [allGroups, allTeachers, roomRows] = await Promise.all([
    prisma.group.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { role: { in: [Role.TEACHER, Role.ADMIN] }, isMaster: false },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.scheduleEntry.findMany({
      select: { room: true },
      distinct: ["room"],
      orderBy: { room: "asc" },
    }),
  ]);

  const rooms = roomRows.map((r) => r.room);

  const groups = allGroups.filter((g) => smartMatch(q, g.name)).slice(0, 6);
  const teachers = allTeachers.filter((t) => smartMatch(q, t.name)).slice(0, 6);
  const matchedRooms = rooms.filter((r) => smartMatch(q, r)).slice(0, 6);

  return NextResponse.json({ groups, teachers, rooms: matchedRooms });
}
