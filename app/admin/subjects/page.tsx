import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/prisma-client";
import { getCurrentUser } from "@/lib/session";
import { getAdminScope } from "@/lib/actions/admin";
import { CreateSubjectDialog } from "@/components/admin/create-subject-dialog";
import { SubjectsTable } from "@/components/admin/subjects-table";

export default async function SubjectsPage() {
  const user = await getCurrentUser();
  const scope = user?.role === Role.ADMIN ? await getAdminScope(user.id) : null;
  const isMaster = scope?.isMaster ?? user?.isMaster ?? false;
  const scopeIds = scope?.specialtyIds ?? [];

  const specialties = await prisma.specialty.findMany({
    where: !isMaster && scopeIds.length > 0 ? { id: { in: scopeIds } } : undefined,
    orderBy: { name: "asc" },
    select: { id: true, name: true, abbreviation: true },
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Предметы</h1>
        <CreateSubjectDialog specialties={specialties} />
      </div>
      <SubjectsTable specialties={specialties} />
    </div>
  );
}
