"use client";

import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/prisma-client";
import { AdminJournalsView } from "@/components/admin/admin-journals-view";
import { PageLoading } from "@/components/ui/page-state";
import { useDemoUser } from "@/lib/demo-session";
import { useDemoData } from "@/lib/use-demo-data";

export default function AdminJournalsPage() {
  const user = useDemoUser();

  const { data, loading } = useDemoData(
    ["admin-journals-page", user?.id],
    async () => {
      const [curatedGroupsCount, teachers] = await Promise.all([
        prisma.group.count({ where: { curatorId: user?.id } }),
        user?.isMaster
          ? prisma.user.findMany({
              where: { role: { in: [Role.TEACHER, Role.ADMIN] }, isMaster: false },
              orderBy: { name: "asc" },
              select: { id: true, name: true },
            })
          : Promise.resolve([]),
      ]);
      return { curatedGroupsCount, teachers };
    },
    { enabled: !!user },
  );

  if (loading || !data) return <PageLoading />;

  return (
    <AdminJournalsView
      curatedGroupsCount={data.curatedGroupsCount}
      teachers={data.teachers}
    />
  );
}
