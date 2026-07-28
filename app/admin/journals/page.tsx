import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Role } from "@/lib/prisma-client";
import { redirect } from "next/navigation";
import { AdminJournalsView } from "@/components/admin/admin-journals-view";

export default async function AdminJournalsPage() {
  const user = await requireRole(Role.ADMIN);
  if (!user) redirect("/login");

  const [curatedGroupsCount, teachers] = await Promise.all([
    prisma.group.count({ where: { curatorId: user.id } }),
    user.isMaster
      ? prisma.user.findMany({
          where: { role: { in: [Role.TEACHER, Role.ADMIN] }, isMaster: false },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <AdminJournalsView
      curatedGroupsCount={curatedGroupsCount}
      teachers={teachers}
    />
  );
}
