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
  const isMaster = scope?.isMaster ?? user.isMaster;

  const sp = req.nextUrl.searchParams;
  const tab = sp.get("tab") ?? "all";
  const search = sp.get("search") ?? "";
  const teacherIdParam = sp.get("teacherId") ?? "";
  const { page, limit, skip } = parsePagination(sp, 20);

  if (tab === "curated") {
    const where: Prisma.GroupWhereInput = { curatorId: user.id };
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    const [groups, total] = await Promise.all([
      prisma.group.findMany({
        where,
        include: {
          assignments: {
            include: {
              subject: true,
              teachers: { select: { name: true } },
              lessons: { select: { id: true } },
            },
            orderBy: { subject: { name: "asc" } },
          },
        },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.group.count({ where }),
    ]);

    return NextResponse.json({ data: groups, ...paginationMeta(total, page, limit) });
  }

  // tab === "all"
  const where: Prisma.GroupWhereInput = {};
  const and: Prisma.GroupWhereInput[] = [];

  if (search) {
    and.push({
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        {
          assignments: {
            some: {
              OR: [
                { subject: { name: { contains: search, mode: "insensitive" } } },
                { teachers: { some: { name: { contains: search, mode: "insensitive" } } } },
              ],
            },
          },
        },
      ],
    });
  }

  const scopeIds = scope?.specialtyIds ?? [];

  if (!isMaster) {
    if (scopeIds.length > 0) {
      and.push({
        OR: [
          { specialtyId: { in: scopeIds } },
          { assignments: { some: { teachers: { some: { id: user.id } } } } },
          {
            assignments: {
              some: {
                teachers: { some: { specialties: { some: { id: { in: scopeIds } } } } },
              },
            },
          },
        ],
      });
    } else {
      and.push({ assignments: { some: { teachers: { some: { id: user.id } } } } });
    }
  } else if (teacherIdParam) {
    and.push({ assignments: { some: { teachers: { some: { id: teacherIdParam } } } } });
  }

  if (and.length) where.AND = and;

  const scopedAssignmentWhere: Prisma.AssignmentWhereInput =
    scopeIds.length > 0
      ? {
          OR: [
            { group: { specialtyId: { in: scopeIds } } },
            { teachers: { some: { id: user.id } } },
            { teachers: { some: { specialties: { some: { id: { in: scopeIds } } } } } },
          ],
        }
      : { teachers: { some: { id: user.id } } };

  const [groups, total] = await Promise.all([
    prisma.group.findMany({
      where,
      include: {
        assignments: {
          where: !isMaster
            ? scopedAssignmentWhere
            : teacherIdParam
              ? { teachers: { some: { id: teacherIdParam } } }
              : search
                ? {
                    OR: [
                      { subject: { name: { contains: search, mode: "insensitive" } } },
                      { teachers: { some: { name: { contains: search, mode: "insensitive" } } } },
                    ],
                  }
                : undefined,
          include: {
            subject: true,
            teachers: { select: { name: true } },
            lessons: { select: { id: true } },
          },
          orderBy: { subject: { name: "asc" } },
        },
      },
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
    prisma.group.count({ where }),
  ]);

  return NextResponse.json({
    data: groups,
    ...paginationMeta(total, page, limit),
  });
}
