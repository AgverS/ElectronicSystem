import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role, RecordKind } from "@/lib/prisma-client";
import { Prisma } from "@/lib/prisma-client";
import { parsePagination, paginationMeta } from "@/lib/paginate";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const studentId = sp.get("studentId") ?? "";
  const kind = sp.get("kind") ?? "";
  const { page, limit, skip } = parsePagination(sp);

  if (!studentId) {
    return NextResponse.json({ error: "studentId is required" }, { status: 400 });
  }

  const where: Prisma.StudentRecordWhereInput = { studentId };
  if (kind === RecordKind.REWARD || kind === RecordKind.PENALTY) {
    where.kind = kind;
  }

  const [records, total] = await Promise.all([
    prisma.studentRecord.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        kind: true,
        number: true,
        date: true,
        reason: true,
        writtenOffAt: true,
        issuedBy: { select: { name: true } },
        attachments: {
          select: { id: true, fileName: true, mimeType: true, size: true },
          orderBy: { createdAt: "asc" },
        },
      },
      skip,
      take: limit,
    }),
    prisma.studentRecord.count({ where }),
  ]);

  return NextResponse.json({ data: records, ...paginationMeta(total, page, limit) });
}
