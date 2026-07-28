import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getAdminScope } from "@/lib/actions/admin";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/prisma-client";

export async function GET() {
  const user = await getCurrentUser();

  // Non-master admins see only groups of their specialties
  if (user?.role === Role.ADMIN && !user.isMaster) {
    const scope = await getAdminScope(user.id);
    if (scope && scope.specialtyIds.length > 0) {
      const groups = await prisma.group.findMany({
        where: { specialtyId: { in: scope.specialtyIds } },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
      return NextResponse.json(groups);
    }
  }

  const groups = await prisma.group.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(groups);
}
