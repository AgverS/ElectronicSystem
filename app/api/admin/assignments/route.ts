import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getAdminScope } from "@/lib/actions/admin";
import { prisma } from "@/lib/prisma";
import { Role, Prisma } from "@/lib/prisma-client";
import { parsePagination, paginationMeta } from "@/lib/paginate";
import { shortName } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scope = await getAdminScope(user.id);
  const isMaster = scope?.isMaster ?? user.isMaster;

  const sp = req.nextUrl.searchParams;
  const search = sp.get("search") ?? "";
  const teacherIdParam = sp.get("teacherId") ?? "";
  const groupId = sp.get("groupId") ?? "";
  const subjectId = sp.get("subjectId") ?? "";
  const { page, limit, skip } = parsePagination(sp);

  const where: Prisma.AssignmentWhereInput = {};
  const and: Prisma.AssignmentWhereInput[] = [];

  if (!isMaster) {
    // Админ, закреплённый за специальностями, видит назначения своих групп и
    // преподавателей этих специальностей (плюс собственные пары). Без
    // специальностей — только свои, как и было.
    if (scope && scope.specialtyIds.length > 0) {
      and.push({
        OR: [
          { teachers: { some: { id: user.id } } },
          { group: { specialtyId: { in: scope.specialtyIds } } },
          {
            teachers: {
              some: {
                specialties: { some: { id: { in: scope.specialtyIds } } },
              },
            },
          },
        ],
      });
    } else {
      and.push({ teachers: { some: { id: user.id } } });
    }
  } else {
    if (teacherIdParam) where.teachers = { some: { id: teacherIdParam } };
  }

  if (groupId) where.groupId = groupId;
  if (subjectId) where.subjectId = subjectId;
  if (search) {
    and.push({
      OR: [
        { teachers: { some: { name: { contains: search, mode: "insensitive" } } } },
        { group: { name: { contains: search, mode: "insensitive" } } },
        { subject: { name: { contains: search, mode: "insensitive" } } },
      ],
    });
  }

  if (and.length) where.AND = and;

  const assignments = await prisma.assignment.findMany({
    where,
    orderBy: [
      { subject: { name: "asc" } },
      { group: { name: "asc" } },
    ],
    include: {
      teachers: { select: { id: true, name: true } },
      group: { select: { name: true } },
      subject: { select: { name: true } },
    },
  });

  if (sp.get("raw") === "true" || groupId) {
    const rawData = assignments.map((a) => ({
      id: a.id,
      groupId: a.groupId,
      subjectId: a.subjectId,
      teacherId: a.teachers[0]?.id ?? "",
      teachers: a.teachers,
    }));
    return NextResponse.json({ data: rawData });
  }

  // Group by teacher + subject
  type Row = {
    key: string;
    teacherName: string;
    subjectName: string;
    subjectId: string;
    groups: { assignmentId: string; groupId: string; groupName: string; teachers: { id: string; name: string }[] }[];
  };
  const rowsMap = new Map<string, Row>();
  for (const a of assignments) {
    const tNames = a.teachers.map((t) => shortName(t.name)).join(", ");
    const tIds = a.teachers.map((t) => t.id).join(",");
    const key = `${tIds}::${a.subjectId}`;
    let row = rowsMap.get(key);
    if (!row) {
      row = {
        key,
        teacherName: tNames || "Нет преподавателя",
        subjectName: a.subject.name,
        subjectId: a.subjectId,
        groups: [],
      };
      rowsMap.set(key, row);
    }
    row.groups.push({ assignmentId: a.id, groupId: a.groupId, groupName: a.group.name, teachers: a.teachers });
  }

  const rows = [...rowsMap.values()];
  const total = rows.length;
  const data = rows.slice(skip, skip + limit);

  return NextResponse.json({ data, ...paginationMeta(total, page, limit) });
}
