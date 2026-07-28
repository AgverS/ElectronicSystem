import { redirect } from "next/navigation";
import { requireRole } from "@/lib/session";
import { Role } from "@/lib/prisma-client";
import { RecordsView } from "@/components/admin/records-view";

export default async function AdminRecordsPage() {
  const user = await requireRole(Role.ADMIN);
  if (!user) redirect("/login");

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Поощрения и взыскания</h1>
      <RecordsView />
    </div>
  );
}
