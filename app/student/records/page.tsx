"use client";

import { prisma } from "@/lib/prisma";
import { useDemoUser } from "@/lib/demo-session";
import { useDemoData } from "@/lib/use-demo-data";
import { useT } from "@/lib/i18n/provider";
import { PageLoading } from "@/components/ui/page-state";
import { StudentRecordsList } from "@/components/records/student-records-list";
import { isPenaltyExpired, isPenaltyWrittenOff } from "@/lib/records";

export default function StudentRecordsPage() {
  const user = useDemoUser();
  const t = useT();

  const { data, loading } = useDemoData(
    ["student-records", user?.id],
    async () => {
      const records = await prisma.studentRecord.findMany({
        where: { studentId: user?.id },
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
      // Spent and written-off penalties stay on the administrator's record but
      // no longer count against the student, so they are not shown here.
      return records
        .filter((r) => !isPenaltyExpired(r, now) && !isPenaltyWrittenOff(r))
        .map((r) => ({
          id: r.id,
          kind: r.kind,
          number: r.number,
          date: r.date.toISOString(),
          reason: r.reason,
          attachments: r.attachments,
        }));
    },
    { enabled: !!user },
  );

  if (loading) return <PageLoading />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("nav.records")}</h1>
      <StudentRecordsList records={data ?? []} />
    </div>
  );
}
