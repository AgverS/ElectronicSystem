import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/prisma-client";
import { redirect } from "next/navigation";
import { cn, formatSemesterName } from "@/lib/utils";

function fmtDate(d: Date) {
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

function average(grades: string[]): string | null {
  const nums = grades.filter((g) => g !== "Н" && g !== "").map(Number);
  if (nums.length === 0) return null;
  return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1);
}

const GRADE_COLORS: Record<string, string> = {
  Н: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  "1": "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  "2": "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  "3": "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  "4": "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  "5": "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  "6": "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  "7": "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  "8": "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  "9": "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  "10": "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
};

const RED_STYLE = "bg-red-500 text-white dark:bg-red-600 dark:text-white ring-2 ring-red-300 dark:ring-red-900";

function getGradeStyle(val: string, lessonType: string) {
  const isN = val === "Н";
  const numVal = parseInt(val);
  const isRed = 
    (lessonType === "практика" && isN) ||
    ((lessonType === "лабораторная" || lessonType === "ОКР") && (isN || (!isNaN(numVal) && numVal < 3)));
  
  return isRed ? RED_STYLE : (GRADE_COLORS[val] ?? "bg-muted");
}

export default async function StudentPage() {
  const user = await requireRole(Role.STUDENT, Role.ADMIN);
  if (!user) redirect("/login");

  if (!user.groupId) {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Мои отметки</h1>
        <p className="text-muted-foreground">
          Вы не добавлены ни в одну группу.
        </p>
      </div>
    );
  }

  const group = await prisma.group.findUnique({ where: { id: user.groupId } });
  const groupName = group?.name;

  const semesters = await prisma.semester.findMany({
    orderBy: [{ year: "desc" }, { number: "desc" }],
  });

  const currentSemester = semesters.find(s => s.isCurrent) || semesters[0];

  const assignments = await prisma.assignment.findMany({
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
  });

  const currentSemesterRows = assignments
    .map((a) => {
      const lessons = a.lessons.filter((l) => l.semester.id === currentSemester?.id);
      const grades = lessons.map((l) => l.grades[0]?.value ?? "");
      return { subjectId: a.subject.id, subject: a.subject.name, lessons, grades };
    })
    .filter((r) => r.lessons.length > 0);

  // Сводка за текущий семестр
  const allVals = currentSemesterRows.flatMap((r) => r.grades).filter((g) => g !== "");
  const numeric = allVals.filter((g) => g !== "Н").map(Number).filter((n) => !isNaN(n));
  const avgOverall = numeric.length ? (numeric.reduce((a, b) => a + b, 0) / numeric.length).toFixed(1) : "—";
  const absCount = allVals.filter((g) => g === "Н").length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="font-mono text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {currentSemester ? formatSemesterName(currentSemester, groupName) : "Мой кабинет"}
          </p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl">Мои отметки</h1>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:max-w-md">
        <Tile label="Средний балл" value={avgOverall} />
        <Tile label="Пропусков" value={String(absCount)} tone={absCount > 0 ? "warn" : undefined} />
        <Tile label="Предметов" value={String(currentSemesterRows.length)} />
      </div>

      <div className="flex flex-col gap-6">
        {currentSemester ? (
          <section>
            <div className="overflow-auto rounded-xl border bg-card shadow-xs">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2.5 text-left font-semibold">Предмет</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Отметки</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Средний балл</th>
                  </tr>
                </thead>
                <tbody>
                  {currentSemesterRows.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                        Нет данных за текущий семестр
                      </td>
                    </tr>
                  )}
                  {currentSemesterRows.map((row) => {
                    const avg = average(row.grades);
                    return (
                      <tr key={row.subjectId} className="border-t hover:bg-muted/30">
                        <td className="px-4 py-2 font-medium whitespace-nowrap">
                          {row.subject}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex flex-wrap gap-1">
                            {row.lessons.map((l, i) => {
                              const val = row.grades[i];
                              if (!val) return null;
                              return (
                                <span
                                  key={l.id}
                                  title={fmtDate(l.date) + (l.topic ? " · " + l.topic : "")}
                                  className={cn(
                                    "inline-flex h-6 min-w-6 items-center justify-center rounded px-1 text-xs font-medium",
                                    getGradeStyle(val, l.type)
                                  )}
                                >
                                  {val}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right font-mono font-bold tabular-nums">
                          {avg ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <p className="text-muted-foreground">Семестры не настроены</p>
        )}
      </div>
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