import { redirect } from "next/navigation";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/prisma-client";
import { StudentRecordsList } from "@/components/records/student-records-list";
import { isPenaltyExpired, isPenaltyWrittenOff } from "@/lib/records";

export default async function StudentRecordsPage() {
  const user = await requireRole(Role.STUDENT, Role.ADMIN);
  if (!user) redirect("/login");

  const records = await prisma.studentRecord.findMany({
    where: { studentId: user.id },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      kind: true,
      number: true,
      date: true,
      reason: true,
      writtenOffAt: true,
      attachments: {
        select: { id: true, fileName: true, mimeType: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const now = new Date();
  const items = records
    .filter((r) => !isPenaltyExpired(r, now) && !isPenaltyWrittenOff(r))
    .map((r) => ({
      id: r.id,
      kind: r.kind,
      number: r.number,
      date: r.date.toISOString(),
      reason: r.reason,
      attachments: r.attachments,
    }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Поощрения и взыскания</h1>
      <StudentRecordsList records={items} />
    </div>
  );
}
