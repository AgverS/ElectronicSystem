import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role, Prisma } from "@/lib/prisma-client";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.TEACHER && user.role !== Role.ADMIN)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const tab = sp.get("tab") ?? "my";
  const search = sp.get("search") ?? "";

  if (tab === "curated") {
    const groups = await prisma.group.findMany({
      where: { curatorId: user.id },
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
    });

    return NextResponse.json({ data: groups });
  }

  // tab === "my"
  const where: Prisma.AssignmentWhereInput = {
    teachers: { some: { id: user.id } },
  };
  if (search) {
    where.OR = [
      { subject: { name: { contains: search, mode: "insensitive" } } },
      { group: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  const assignments = await prisma.assignment.findMany({
    where,
    include: {
      subject: true,
      group: true,
      teachers: { select: { name: true } },
      lessons: { select: { id: true } },
    },
    orderBy: [{ group: { name: "asc" } }, { subject: { name: "asc" } }],
  });

  return NextResponse.json({ data: assignments });
}
