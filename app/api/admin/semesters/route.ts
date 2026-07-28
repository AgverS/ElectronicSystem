import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role, Prisma } from "@/lib/prisma-client";
import { parsePagination, paginationMeta } from "@/lib/paginate";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const search = sp.get("search") ?? "";
  const year = sp.get("year") ?? "";
  const { page, limit, skip } = parsePagination(sp);

  const where: Prisma.SemesterWhereInput = {};
  if (search) {
    where.name = { contains: search, mode: "insensitive" };
  }
  if (year) {
    where.year = year;
  }

  const [semesters, total] = await Promise.all([
    prisma.semester.findMany({
      where,
      orderBy: { startDate: "desc" },
      skip,
      take: limit,
    }),
    prisma.semester.count({ where }),
  ]);

  return NextResponse.json({ data: semesters, ...paginationMeta(total, page, limit) });
}
