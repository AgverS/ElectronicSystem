import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getAdminScope } from "@/lib/actions/admin";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/prisma-client";
import { Prisma } from "@/lib/prisma-client";
import { parsePagination, paginationMeta } from "@/lib/paginate";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scope = await getAdminScope(user.id);
  const sp = req.nextUrl.searchParams;
  const search = sp.get("search") ?? "";
  const role = sp.get("role") ?? "";
  const rolesParam = sp.get("roles") ?? "";
  const groupId = sp.get("groupId") ?? "";
  const { page, limit, skip } = parsePagination(sp);

  const where: Prisma.UserWhereInput = { isMaster: false };

  if (groupId) {
    where.groupId = groupId;
  }

  if (rolesParam) {
    const validRoles = rolesParam
      .split(",")
      .filter((r) => Object.values(Role).includes(r as Role)) as Role[];
    if (validRoles.length > 0) where.role = { in: validRoles };
  } else if (role && Object.values(Role).includes(role as Role)) {
    where.role = role as Role;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { username: { contains: search, mode: "insensitive" } },
    ];
  }

  // Non-master admins: teachers/admins filtered by specialty, students by group specialty
  if (scope && !scope.isMaster && scope.specialtyIds.length > 0) {
    const requestedRoles = rolesParam
      ? rolesParam.split(",").filter((r) => Object.values(Role).includes(r as Role))
      : role
        ? [role]
        : [];
    const isStudentsOnly =
      requestedRoles.length > 0 &&
      requestedRoles.every((r) => r === Role.STUDENT);
    const isStaffOnly =
      requestedRoles.length > 0 &&
      requestedRoles.every((r) => r === Role.TEACHER || r === Role.ADMIN);

    if (isStudentsOnly) {
      where.group = { specialtyId: { in: scope.specialtyIds } };
    } else if (isStaffOnly) {
      where.specialties = { some: { id: { in: scope.specialtyIds } } };
    } else {
      // Mixed or no role filter — use OR across both
      where.OR = [
        ...(where.OR ?? []),
        { specialties: { some: { id: { in: scope.specialtyIds } } } },
        { group: { specialtyId: { in: scope.specialtyIds } } },
      ];
    }
  }

  const [rawUsers, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ role: "asc" }, { name: "asc" }],
      include: {
        group: { select: { name: true } },
        specialties: { select: { id: true, name: true, abbreviation: true }, orderBy: { name: "asc" } },
        subjects: { select: { id: true, name: true }, orderBy: { name: "asc" } },
        curatedGroups: { select: { id: true } },
      },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  const users = rawUsers.map(({ isMaster: _m, ...u }) => u);

  return NextResponse.json({ data: users, ...paginationMeta(total, page, limit) });
}
