"use client";

import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/prisma-client";
import { getAdminScope } from "@/lib/actions/admin";
import { CreateSubjectDialog } from "@/components/admin/create-subject-dialog";
import { SubjectsTable } from "@/components/admin/subjects-table";
import { PageLoading } from "@/components/ui/page-state";
import { useDemoUser } from "@/lib/demo-session";
import { useDemoData } from "@/lib/use-demo-data";
import { useT } from "@/lib/i18n/provider";

export default function SubjectsPage() {
  const user = useDemoUser();
  const t = useT();

  const { data: specialties, loading } = useDemoData(
    ["admin-subjects-page", user?.id],
    async () => {
      const scope = user?.role === Role.ADMIN ? await getAdminScope(user.id) : null;
      const isMaster = scope?.isMaster ?? user?.isMaster ?? false;
      const scopeIds = scope?.specialtyIds ?? [];

      return prisma.specialty.findMany({
        where: !isMaster && scopeIds.length > 0 ? { id: { in: scopeIds } } : undefined,
        orderBy: { name: "asc" },
        select: { id: true, name: true, abbreviation: true },
      });
    },
    { enabled: !!user },
  );

  if (loading || !specialties) return <PageLoading />;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{t("nav.subjects")}</h1>
        <CreateSubjectDialog specialties={specialties} />
      </div>
      <SubjectsTable specialties={specialties} />
    </div>
  );
}
