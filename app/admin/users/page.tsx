"use client";

import { prisma } from "@/lib/prisma";
import { getAdminScope } from "@/lib/actions/admin";
import { CreateUsersDialog } from "@/components/admin/create-users-dialog";
import { UsersTabs } from "@/components/admin/users-tabs";
import { PageLoading } from "@/components/ui/page-state";
import { useDemoUser } from "@/lib/demo-session";
import { useDemoData } from "@/lib/use-demo-data";
import { useT } from "@/lib/i18n/provider";

export default function UsersPage() {
  const currentUser = useDemoUser();
  const t = useT();

  const { data, loading } = useDemoData(
    ["admin-users-page", currentUser?.id],
    async () => {
      const scope = currentUser ? await getAdminScope(currentUser.id) : null;
      const [groups, specialties] = await Promise.all([
        prisma.group.findMany({ orderBy: { name: "asc" } }),
        prisma.specialty.findMany({
          orderBy: { name: "asc" },
          select: { id: true, name: true, abbreviation: true },
        }),
      ]);
      return {
        groups,
        specialties,
        // An administrator tied to a single specialty does not need the column.
        hideSpecialty: !!scope && !scope.isMaster && scope.specialtyIds.length === 1,
      };
    },
    { enabled: !!currentUser },
  );

  if (loading || !data) return <PageLoading />;

  return (
    <div>
      <div className="mb-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("nav.users")}</h1>
        <CreateUsersDialog
          groups={data.groups}
          specialties={data.specialties}
          isMasterActor={false}
        />
      </div>

      <UsersTabs
        groups={data.groups}
        specialties={data.specialties}
        currentUserId={currentUser?.id ?? ""}
        isMasterActor={false}
        hideSpecialty={data.hideSpecialty}
      />
    </div>
  );
}
