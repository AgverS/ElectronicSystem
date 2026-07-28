import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/prisma-client";
import { getCurrentUser } from "@/lib/session";
import { getAdminScope } from "@/lib/actions/admin";
import { CreateGroupDialog } from "@/components/admin/create-group-dialog";
import { GroupsTable } from "@/components/admin/groups-table";

export default async function GroupsPage() {
  const currentUser = await getCurrentUser();
  const scope = currentUser ? await getAdminScope(currentUser.id) : null;

  // Админу, закреплённому за одной специальностью, колонка специальности не нужна.
  const hideSpecialty =
    !!scope && !scope.isMaster && scope.specialtyIds.length === 1;

  const specialties = await prisma.specialty.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, abbreviation: true, letter: true },
  });

  const staffRoles: Role[] = [Role.TEACHER, Role.ADMIN];

  const teachers = await prisma.user.findMany({
    where: {
      role: { in: staffRoles },
      isMaster: false,
      ...(scope && !scope.isMaster && scope.specialtyIds.length > 0
        ? { specialties: { some: { id: { in: scope.specialtyIds } } } }
        : {}),
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Группы</h1>
        <CreateGroupDialog teachers={teachers} specialties={specialties} />
      </div>
      <GroupsTable
        teachers={teachers}
        specialties={specialties}
        hideSpecialty={hideSpecialty}
      />
    </div>
  );
}
