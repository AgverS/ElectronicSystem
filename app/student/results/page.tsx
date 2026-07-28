import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/prisma-client";
import { redirect } from "next/navigation";
import { formatSemesterName } from "@/lib/utils";
import { ResultsExportButton } from "@/components/student/results-export-button";

function average(grades: string[]): string | null {
  const nums = grades.filter((g) => g !== "Н" && g !== "").map(Number);
  if (nums.length === 0) return null;
  return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1);
}

export default async function StudentResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ semesterId?: string }>;
}) {
  const user = await requireRole(Role.STUDENT, Role.ADMIN);
  if (!user) redirect("/login");

  const { semesterId } = await searchParams;

  const semesters = await prisma.semester.findMany({
    where: user.groupId
      ? { lessons: { some: { assignment: { groupId: user.groupId } } } }
      : undefined,
    orderBy: [{ year: "desc" }, { number: "desc" }],
  });

  const group = user.groupId ? await prisma.group.findUnique({ where: { id: user.groupId } }) : null;
  const groupName = group?.name;

  const activeSemesterId = semesterId || semesters.find(s => s.isCurrent)?.id || semesters[0]?.id;

  const assignments = await prisma.assignment.findMany({
    where: { groupId: user.groupId ?? "" },
    include: {
      subject: true,
      lessons: {
        where: { semesterId: activeSemesterId },
        include: {
          grades: { where: { studentId: user.id } },
        },
      },
    },
    orderBy: { subject: { name: "asc" } },
  });

  const rows = assignments.map(a => {
    const grades = a.lessons.map(l => l.grades[0]?.value ?? "").filter(Boolean);
    return {
      subject: a.subject.name,
      avg: average(grades),
      totalLessons: a.lessons.length,
      absences: a.lessons.filter(l => l.grades[0]?.value === "Н").length,
    };
  }).filter(r => r.totalLessons > 0);

  const activeSemester = semesters.find((s) => s.id === activeSemesterId);
  const semesterLabel = activeSemester
    ? formatSemesterName(activeSemester, groupName)
    : "семестр";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Итоги семестров</h1>
        <ResultsExportButton rows={rows} semesterLabel={semesterLabel} studentName={user.name} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Семестр:</span>
        <div className="flex flex-wrap gap-2">
          {semesters.map((s) => (
            <a
              key={s.id}
              href={"/student/results?semesterId=" + s.id}
              className={"rounded-md px-3 py-1.5 text-xs font-medium transition-colors " + (
                s.id === activeSemesterId
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              )}
            >
              {formatSemesterName(s, groupName)}
            </a>
          ))}
        </div>
      </div>

      <div className="overflow-auto rounded-lg border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Предмет</th>
              <th className="px-4 py-3 text-center font-medium">Уроков</th>
              <th className="px-4 py-3 text-center font-medium">Пропусков</th>
              <th className="px-4 py-3 text-right font-medium">Средний балл</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                  Нет данных за выбранный семестр
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.subject} className="border-t hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{row.subject}</td>
                <td className="px-4 py-3 text-center">{row.totalLessons}</td>
                <td className="px-4 py-3 text-center text-orange-600 dark:text-orange-400 font-medium">
                  {row.absences || "-"}
                </td>
                <td className="px-4 py-3 text-right font-bold tabular-nums">
                  {row.avg ?? "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}