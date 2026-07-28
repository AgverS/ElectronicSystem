import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getAdminScope } from "@/lib/actions/admin";
import { CreateUsersDialog } from "@/components/admin/create-users-dialog";
import { UsersTabs } from "@/components/admin/users-tabs";

export default async function UsersPage() {
  const currentUser = await getCurrentUser();
  const isMasterActor = currentUser?.isMaster ?? false;
  const scope = currentUser ? await getAdminScope(currentUser.id) : null;

  // Админу с единственной специальностью колонка специальностей не нужна.
  const hideSpecialty =
    !!scope && !scope.isMaster && scope.specialtyIds.length === 1;

  const [groups, specialties] = await Promise.all([
    prisma.group.findMany({ orderBy: { name: "asc" } }),
    prisma.specialty.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, abbreviation: true },
    }),
  ]);

  return (
    <div>
      <div className="mb-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Пользователи</h1>
        <CreateUsersDialog
          groups={groups}
          specialties={specialties}
          isMasterActor={isMasterActor}
        />
      </div>

      <UsersTabs
        groups={groups}
        specialties={specialties}
        currentUserId={currentUser?.id ?? ""}
        isMasterActor={isMasterActor}
        hideSpecialty={hideSpecialty}
      />
    </div>
  );
}
