import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Role } from "@/lib/prisma-client";

export async function GET() {
  const user = await requireRole(Role.STUDENT, Role.ADMIN);
  if (!user || !user.groupId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const group = await prisma.group.findUnique({
    where: { id: user.groupId },
    include: {
      curator: { select: { name: true } },
      students: {
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!group) {
    return new NextResponse("Group not found", { status: 404 });
  }

  return NextResponse.json(group);
}
