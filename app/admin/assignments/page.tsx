import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/prisma-client";
import { getCurrentUser } from "@/lib/session";
import { getAdminScope } from "@/lib/actions/admin";
import { CreateAssignmentDialog } from "@/components/admin/create-assignment-dialog";
import { AssignmentsTable } from "@/components/admin/assignments-table";

export default async function AssignmentsPage() {
  const currentUser = await getCurrentUser();
  const scope = currentUser ? await getAdminScope(currentUser.id) : null;
  const isMaster = scope?.isMaster ?? currentUser?.isMaster ?? false;

  const staffRoles: Role[] = [Role.TEACHER, Role.ADMIN];

  const [teachers, groups, subjects] = await Promise.all([
    isMaster
      ? prisma.user.findMany({
          where: { role: { in: staffRoles }, isMaster: false },
          orderBy: { name: "asc" },
        })
      : scope && scope.specialtyIds.length > 0
        ? prisma.user.findMany({
            where: {
              role: { in: staffRoles },
              isMaster: false,
              specialties: { some: { id: { in: scope.specialtyIds } } },
            },
            orderBy: { name: "asc" },
          })
        : prisma.user.findMany({
            where: { role: { in: staffRoles }, isMaster: false },
            orderBy: { name: "asc" },
          }),
    scope && !isMaster && scope.specialtyIds.length > 0
      ? prisma.group.findMany({
          where: { specialtyId: { in: scope.specialtyIds } },
          orderBy: { name: "asc" },
        })
      : prisma.group.findMany({ orderBy: { name: "asc" } }),
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Назначения</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Кто ведёт какой предмет у какой группы.
          </p>
        </div>
        <CreateAssignmentDialog teachers={teachers} groups={groups} subjects={subjects} />
      </div>
      <AssignmentsTable teachers={teachers} groups={groups} subjects={subjects} />
    </div>
  );
}
