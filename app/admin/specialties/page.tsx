import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { SpecialtiesManager } from "@/components/admin/specialties-manager";

export default async function SpecialtiesPage() {
  const currentUser = await getCurrentUser();

  const specialties = await prisma.specialty.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { subjects: true, groups: true, users: true } },
    },
  });

  const totalCount = specialties.length;
  const adminSpecialtyIds = currentUser
    ? (
      await prisma.user.findUnique({
        where: { id: currentUser.id },
        select: { specialties: { select: { id: true } } },
      })
    )?.specialties.map((s) => s.id) ?? []
    : [];

  const canManage =
    currentUser?.isMaster ||
    (totalCount > 0 && adminSpecialtyIds.length === totalCount) ||
    totalCount === 0;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Специальности</h1>
      </div>
      <SpecialtiesManager
        specialties={specialties.map((s) => ({
          id: s.id,
          name: s.name,
          abbreviation: s.abbreviation,
          letter: s.letter,
          subjectsCount: s._count.subjects,
          groupsCount: s._count.groups,
          usersCount: s._count.users,
        }))}
        canManage={canManage}
      />
    </div>
  );
}
