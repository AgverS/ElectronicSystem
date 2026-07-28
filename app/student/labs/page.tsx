"use client";

import { prisma } from "@/lib/prisma";
import { useDemoUser } from "@/lib/demo-session";
import { useDemoData } from "@/lib/use-demo-data";
import { useT } from "@/lib/i18n/provider";
import { useFormatters } from "@/lib/format";
import { PageLoading, EmptyState } from "@/components/ui/page-state";
import { labStatus, labStats } from "@/lib/labs";

export default function StudentLabsPage() {
  const user = useDemoUser();
  const t = useT();
  const { formatShortDate } = useFormatters();

  const { data, loading } = useDemoData(
    ["student-labs", user?.id, user?.groupId],
    async () => {
      if (!user?.groupId) return [];

      const assignments = await prisma.assignment.findMany({
        where: { groupId: user.groupId },
        include: {
          subject: true,
          lessons: {
            // Laboratory lessons, plus every lesson of a practical subject —
            // there, each lesson is itself a piece of laboratory work.
            where: {
              OR: [{ type: "lab" }, { assignment: { subject: { isPractical: true } } }],
            },
            orderBy: { date: "asc" },
            include: { grades: { where: { studentId: user.id } } },
          },
        },
        orderBy: { subject: { name: "asc" } },
      });

      return assignments
        .map((a) => ({
          subject: a.subject.name,
          total: a.labsTotal,
          labs: a.lessons.map((l) => ({
            id: l.id,
            date: l.date,
            deadline: l.deadline,
            grade: l.grades[0]?.value ?? "",
          })),
        }))
        .filter((r) => r.labs.length > 0);
    },
    { enabled: !!user },
  );

  if (loading) return <PageLoading />;

  if (!user?.groupId) {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight">{t("student.labs.title")}</h1>
        <p className="text-muted-foreground">{t("student.noGroup")}</p>
      </div>
    );
  }

  const rows = data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("student.labs.title")}</h1>

      <div className="overflow-auto rounded-lg border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="px-4 py-2 text-left font-medium">{t("term.subject")}</th>
              <th className="px-4 py-2 text-left font-medium">{t("nav.labs")}</th>
              <th className="px-3 py-2 text-center font-medium">{t("lab.status.passed")}</th>
              <th className="px-3 py-2 text-center font-medium">{t("lab.status.failing")}</th>
              <th className="px-3 py-2 text-center font-medium">{t("lab.issued")}</th>
              <th className="px-3 py-2 text-center font-medium">{t("common.total")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <EmptyState title={t("student.labs.empty")} />
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const stats = labStats(row.labs);
              return (
                <tr key={row.subject} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-2 align-top font-medium">{row.subject}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-2">
                      {row.labs.map((lab) => {
                        const status = labStatus(lab.grade, lab.date, lab.deadline);
                        return (
                          <div
                            key={lab.id}
                            className="flex items-center gap-1.5 rounded-md border bg-muted/30 px-2 py-1"
                          >
                            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                              {formatShortDate(lab.date)}
                            </span>
                            {status === "passed" ? (
                              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-green-600 dark:text-green-400">
                                {t("lab.status.passed")}
                              </span>
                            ) : status === "paid" ? (
                              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
                                {t("lab.status.paid")}
                              </span>
                            ) : lab.grade ? (
                              <span className="font-mono text-[11px] font-bold tabular-nums text-red-500">
                                {lab.grade === "AB" ? t("grade.absent.short") : lab.grade}
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground/30">·</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center align-top font-semibold tabular-nums text-green-600 dark:text-green-400">
                    {stats.passed}
                  </td>
                  <td className="px-3 py-2 text-center align-top font-semibold tabular-nums">
                    {stats.notPassed > 0 ? (
                      <span className="text-red-600 dark:text-red-400">{stats.notPassed}</span>
                    ) : (
                      <span className="text-muted-foreground/30">0</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center align-top tabular-nums text-muted-foreground">
                    {stats.issued}
                  </td>
                  <td className="px-3 py-2 text-center align-top font-semibold tabular-nums">
                    {row.total ?? <span className="text-muted-foreground/30">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
