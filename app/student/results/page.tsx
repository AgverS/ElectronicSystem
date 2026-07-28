"use client";

import { useState } from "react";
import { prisma } from "@/lib/prisma";
import { useDemoUser } from "@/lib/demo-session";
import { useDemoData } from "@/lib/use-demo-data";
import { useT } from "@/lib/i18n/provider";
import { useFormatters } from "@/lib/format";
import { PageLoading, EmptyState } from "@/components/ui/page-state";
import { ResultsExportButton } from "@/components/student/results-export-button";
import { formatAverage, ABSENT } from "@/lib/grades";
import { cn } from "@/lib/utils";

export default function StudentResultsPage() {
  const user = useDemoUser();
  const t = useT();
  const { semesterName } = useFormatters();
  const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(null);

  const { data, loading } = useDemoData(
    ["student-results", user?.id, user?.groupId, selectedSemesterId],
    async () => {
      const semesters = await prisma.semester.findMany({
        where: user?.groupId
          ? { lessons: { some: { assignment: { groupId: user.groupId } } } }
          : undefined,
        orderBy: [{ year: "desc" }, { number: "desc" }],
      });

      const group = user?.groupId
        ? await prisma.group.findUnique({ where: { id: user.groupId } })
        : null;

      const activeSemesterId =
        selectedSemesterId ?? semesters.find((s) => s.isCurrent)?.id ?? semesters[0]?.id ?? null;

      const assignments = await prisma.assignment.findMany({
        where: { groupId: user?.groupId ?? "" },
        include: {
          subject: true,
          lessons: {
            where: { semesterId: activeSemesterId },
            include: { grades: { where: { studentId: user?.id } } },
          },
        },
        orderBy: { subject: { name: "asc" } },
      });

      const rows = assignments
        .map((a) => {
          const grades = a.lessons.map((l) => l.grades[0]?.value ?? "").filter(Boolean);
          return {
            subject: a.subject.name,
            avg: formatAverage(grades),
            totalLessons: a.lessons.length,
            absences: a.lessons.filter((l) => l.grades[0]?.value === ABSENT).length,
          };
        })
        .filter((r) => r.totalLessons > 0);

      return { semesters, group, activeSemesterId, rows };
    },
    { enabled: !!user },
  );

  if (loading || !data) return <PageLoading />;

  const { semesters, group, activeSemesterId, rows } = data;
  const activeSemester = semesters.find((s) => s.id === activeSemesterId) ?? null;
  const semesterLabel = activeSemester ? semesterName(activeSemester, group?.name) : "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("student.results.title")}</h1>
        <ResultsExportButton
          rows={rows.map((r) => ({ ...r, avg: r.avg === "—" ? null : r.avg }))}
          semesterLabel={semesterLabel}
          studentName={user?.name ?? ""}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">{t("term.semester")}:</span>
        <div className="flex flex-wrap gap-2">
          {semesters.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSemesterId(s.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                s.id === activeSemesterId
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {semesterName(s, group?.name)}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-auto rounded-lg border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">{t("term.subject")}</th>
              <th className="px-4 py-3 text-center font-medium">{t("term.lessons")}</th>
              <th className="px-4 py-3 text-center font-medium">{t("term.absences")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("term.average")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4}>
                  <EmptyState title={t("student.results.empty")} />
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.subject} className="border-t hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{row.subject}</td>
                <td className="px-4 py-3 text-center">{row.totalLessons}</td>
                <td className="px-4 py-3 text-center font-medium text-orange-600 dark:text-orange-400">
                  {row.absences || "—"}
                </td>
                <td className="px-4 py-3 text-right font-bold tabular-nums">{row.avg}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
