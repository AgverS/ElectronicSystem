"use client";

import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/prisma-client";
import { getAdminScope } from "@/lib/actions/admin";
import { CreateGroupDialog } from "@/components/admin/create-group-dialog";
import { GroupsTable } from "@/components/admin/groups-table";
import { PageLoading } from "@/components/ui/page-state";
import { useDemoUser } from "@/lib/demo-session";
import { useDemoData } from "@/lib/use-demo-data";
import { useT } from "@/lib/i18n/provider";

export default function GroupsPage() {
  const currentUser = useDemoUser();
  const t = useT();

  const { data, loading } = useDemoData(
    ["admin-groups-page", currentUser?.id],
    async () => {
      const scope = currentUser ? await getAdminScope(currentUser.id) : null;
      const staffRoles: Role[] = [Role.TEACHER, Role.ADMIN];

      const [specialties, teachers] = await Promise.all([
        prisma.specialty.findMany({
          orderBy: { name: "asc" },
          select: { id: true, name: true, abbreviation: true, letter: true },
        }),
        prisma.user.findMany({
          where: {
            role: { in: staffRoles },
            isMaster: false,
            ...(scope && !scope.isMaster && scope.specialtyIds.length > 0
              ? { specialties: { some: { id: { in: scope.specialtyIds } } } }
              : {}),
          },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        }),
      ]);

      return {
        specialties,
        teachers,
        hideSpecialty: !!scope && !scope.isMaster && scope.specialtyIds.length === 1,
      };
    },
    { enabled: !!currentUser },
  );

  if (loading || !data) return <PageLoading />;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("nav.groups")}</h1>
        <CreateGroupDialog teachers={data.teachers} specialties={data.specialties} />
      </div>
      <GroupsTable
        teachers={data.teachers}
        specialties={data.specialties}
        hideSpecialty={data.hideSpecialty}
      />
    </div>
  );
}
