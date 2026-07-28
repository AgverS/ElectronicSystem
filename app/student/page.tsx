"use client";

import { prisma } from "@/lib/prisma";
import { useDemoUser } from "@/lib/demo-session";
import { useDemoData } from "@/lib/use-demo-data";
import { useT } from "@/lib/i18n/provider";
import { useFormatters } from "@/lib/format";
import { PageLoading, EmptyState } from "@/components/ui/page-state";
import { cn } from "@/lib/utils";
import { formatAverage, countAbsences, gradeClasses } from "@/lib/grades";

export default function StudentPage() {
  const user = useDemoUser();
  const t = useT();
  const { formatShortDate, semesterName } = useFormatters();

  const { data, loading } = useDemoData(
    ["student-marks", user?.id, user?.groupId],
    async () => {
      if (!user?.groupId) return null;

      const [group, semesters, assignments] = await Promise.all([
        prisma.group.findUnique({ where: { id: user.groupId } }),
        prisma.semester.findMany({ orderBy: [{ year: "desc" }, { number: "desc" }] }),
        prisma.assignment.findMany({
          where: { groupId: user.groupId },
          include: {
            subject: true,
            lessons: {
              orderBy: { date: "asc" },
              include: {
                grades: { where: { studentId: user.id } },
                semester: { select: { id: true } },
              },
            },
          },
          orderBy: { subject: { name: "asc" } },
        }),
      ]);

      const currentSemester = semesters.find((s) => s.isCurrent) ?? semesters[0] ?? null;

      const rows = assignments
        .map((a) => {
          const lessons = a.lessons.filter((l) => l.semester.id === currentSemester?.id);
          return {
            subjectId: a.subject.id,
            subject: a.subject.name,
            lessons,
            grades: lessons.map((l) => l.grades[0]?.value ?? ""),
          };
        })
        .filter((r) => r.lessons.length > 0);

      return { group, currentSemester, rows };
    },
    { enabled: !!user },
  );

  if (loading) return <PageLoading />;

  if (!user?.groupId) {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight">{t("student.marks.title")}</h1>
        <p className="text-muted-foreground">{t("student.noGroup")}</p>
      </div>
    );
  }

  const { group, currentSemester, rows } = data ?? { group: null, currentSemester: null, rows: [] };

  const allValues = rows.flatMap((r) => r.grades).filter(Boolean);
  const overallAverage = formatAverage(allValues);
  const absences = countAbsences(allValues);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="font-mono text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {currentSemester ? semesterName(currentSemester, group?.name) : t("nav.myAccount")}
          </p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl">
            {t("student.marks.title")}
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:max-w-md">
        <Tile label={t("term.average")} value={overallAverage} />
        <Tile
          label={t("term.absences")}
          value={String(absences)}
          tone={absences > 0 ? "warn" : undefined}
        />
        <Tile label={t("term.subjects")} value={String(rows.length)} />
      </div>

      {currentSemester ? (
        <section className="overflow-auto rounded-xl border bg-card shadow-xs">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/50 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 text-left font-semibold">{t("term.subject")}</th>
                <th className="px-4 py-2.5 text-left font-semibold">{t("term.grades")}</th>
                <th className="px-4 py-2.5 text-right font-semibold">{t("term.average")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={3}>
                    <EmptyState title={t("student.marks.empty")} />
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.subjectId} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-2 font-medium whitespace-nowrap">{row.subject}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-1">
                      {row.lessons.map((lesson, i) => {
                        const value = row.grades[i];
                        if (!value) return null;
                        return (
                          <span
                            key={lesson.id}
                            title={
                              formatShortDate(lesson.date) +
                              (lesson.topic ? ` · ${lesson.topic}` : "")
                            }
                            className={cn(
                              "inline-flex h-6 min-w-6 items-center justify-center rounded px-1 text-xs font-medium",
                              gradeClasses(value, lesson.type),
                            )}
                          >
                            {value === "AB" ? t("grade.absent.short") : value}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right font-mono font-bold tabular-nums">
                    {formatAverage(row.grades)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <p className="text-muted-foreground">{t("student.noSemesters")}</p>
      )}
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border bg-card p-4 shadow-xs">
      <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div
        className={cn(
          "font-mono text-2xl font-bold tabular-nums",
          tone === "warn" && "text-destructive",
        )}
      >
        {value}
      </div>
    </div>
  );
}
