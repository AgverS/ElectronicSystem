"use client";

import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/prisma-client";
import { getAdminScope } from "@/lib/actions/admin";
import { CreateAssignmentDialog } from "@/components/admin/create-assignment-dialog";
import { AssignmentsTable } from "@/components/admin/assignments-table";
import { PageLoading } from "@/components/ui/page-state";
import { useDemoUser } from "@/lib/demo-session";
import { useDemoData } from "@/lib/use-demo-data";
import { useT } from "@/lib/i18n/provider";

export default function AssignmentsPage() {
  const currentUser = useDemoUser();
  const t = useT();

  const { data, loading } = useDemoData(
    ["admin-assignments-page", currentUser?.id],
    async () => {
      const scope = currentUser ? await getAdminScope(currentUser.id) : null;
      const isMaster = scope?.isMaster ?? currentUser?.isMaster ?? false;
      const scoped = scope && !isMaster && scope.specialtyIds.length > 0;
      const staffRoles: Role[] = [Role.TEACHER, Role.ADMIN];

      const [teachers, groups, subjects] = await Promise.all([
        prisma.user.findMany({
          where: {
            role: { in: staffRoles },
            isMaster: false,
            ...(scoped ? { specialties: { some: { id: { in: scope!.specialtyIds } } } } : {}),
          },
          orderBy: { name: "asc" },
        }),
        prisma.group.findMany({
          where: scoped ? { specialtyId: { in: scope!.specialtyIds } } : undefined,
          orderBy: { name: "asc" },
        }),
        prisma.subject.findMany({ orderBy: { name: "asc" } }),
      ]);

      return { teachers, groups, subjects };
    },
    { enabled: !!currentUser },
  );

  if (loading || !data) return <PageLoading />;

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("nav.assignments")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("admin.assignments.subtitle")}</p>
        </div>
        <CreateAssignmentDialog
          teachers={data.teachers}
          groups={data.groups}
          subjects={data.subjects}
        />
      </div>
      <AssignmentsTable teachers={data.teachers} groups={data.groups} subjects={data.subjects} />
    </div>
  );
}
