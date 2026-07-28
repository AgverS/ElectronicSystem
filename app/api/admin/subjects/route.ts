import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getAdminScope } from "@/lib/actions/admin";
import { prisma } from "@/lib/prisma";
import { Role, Prisma } from "@/lib/prisma-client";
import { parsePagination, paginationMeta } from "@/lib/paginate";
import { getCurrentSemesterId } from "@/lib/semester";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scope = await getAdminScope(user.id);
  const isMaster = scope?.isMaster ?? user.isMaster;
  const scopeIds = scope?.specialtyIds ?? [];

  const sp = req.nextUrl.searchParams;
  const search = sp.get("search") ?? "";
  const specialtyId = sp.get("specialtyId") ?? "";
  const { page, limit, skip } = parsePagination(sp);

  const where: Prisma.SubjectWhereInput = {};
  const and: Prisma.SubjectWhereInput[] = [];

  if (search) where.name = { contains: search, mode: "insensitive" };
  if (!isMaster && scopeIds.length > 0) {
    and.push({ specialties: { some: { id: { in: scopeIds } } } });
  }
  if (specialtyId) {
    and.push({ specialties: { some: { id: specialtyId } } });
  }
  if (and.length) where.AND = and;

  const [subjects, total] = await Promise.all([
    prisma.subject.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        specialties: {
          select: { id: true, name: true, abbreviation: true },
          orderBy: { name: "asc" },
        },
      },
      skip,
      take: limit,
    }),
    prisma.subject.count({ where }),
  ]);

  // Hours count only for the semester they were set in; show them only when
  // that semester is the current one, otherwise they read as reset (null).
  const currentSemesterId = await getCurrentSemesterId();
  const data = subjects.map((s) => ({
    ...s,
    hours: s.hoursSemesterId === currentSemesterId ? s.hours : null,
  }));

  return NextResponse.json({ data, ...paginationMeta(total, page, limit) });
}
