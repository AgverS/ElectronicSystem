import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getAdminScope } from "@/lib/actions/admin";
import { prisma } from "@/lib/prisma";
import { Role, Prisma } from "@/lib/prisma-client";
import { parsePagination, paginationMeta } from "@/lib/paginate";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scope = await getAdminScope(user.id);
  const sp = req.nextUrl.searchParams;
  const search = sp.get("search") ?? "";
  const { page, limit, skip } = parsePagination(sp);

  const where: Prisma.GroupWhereInput = {};

  if (scope && !scope.isMaster && scope.specialtyIds.length > 0) {
    where.specialtyId = { in: scope.specialtyIds };
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { curator: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [groups, total] = await Promise.all([
    prisma.group.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        curator: { select: { name: true } },
        specialty: { select: { name: true, abbreviation: true } },
        students: { select: { id: true } },
      },
      skip,
      take: limit,
    }),
    prisma.group.count({ where }),
  ]);

  return NextResponse.json({ data: groups, ...paginationMeta(total, page, limit) });
}
