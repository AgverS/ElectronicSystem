"use client";

import { prisma } from "@/lib/prisma";
import { SpecialtiesManager } from "@/components/admin/specialties-manager";
import { PageLoading } from "@/components/ui/page-state";
import { useDemoUser } from "@/lib/demo-session";
import { useDemoData } from "@/lib/use-demo-data";
import { useT } from "@/lib/i18n/provider";

export default function SpecialtiesPage() {
  const currentUser = useDemoUser();
  const t = useT();

  const { data, loading } = useDemoData(
    ["admin-specialties-page", currentUser?.id],
    async () => {
      const specialties = await prisma.specialty.findMany({
        orderBy: { name: "asc" },
        include: { _count: { select: { subjects: true, groups: true, users: true } } },
      });

      const adminSpecialtyIds = currentUser
        ? ((
            await prisma.user.findUnique({
              where: { id: currentUser.id },
              select: { specialties: { select: { id: true } } },
            })
          )?.specialties.map((s) => s.id) ?? [])
        : [];

      // Only an administrator responsible for every specialty may restructure
      // the list itself.
      const canManage =
        currentUser?.isMaster ||
        (specialties.length > 0 && adminSpecialtyIds.length === specialties.length) ||
        specialties.length === 0;

      return {
        rows: specialties.map((s) => ({
          id: s.id,
          name: s.name,
          abbreviation: s.abbreviation,
          letter: s.letter,
          subjectsCount: s._count.subjects,
          groupsCount: s._count.groups,
          usersCount: s._count.users,
        })),
        canManage,
      };
    },
    { enabled: !!currentUser },
  );

  if (loading || !data) return <PageLoading />;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("nav.specialties")}</h1>
      </div>
      <SpecialtiesManager specialties={data.rows} canManage={data.canManage} />
    </div>
  );
}
