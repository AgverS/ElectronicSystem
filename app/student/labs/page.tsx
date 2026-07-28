import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/prisma-client";
import { labStatus, labStats } from "@/lib/labs";
import { redirect } from "next/navigation";

function fmtDate(d: Date) {
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

export default async function StudentLabsPage() {
  const user = await requireRole(Role.STUDENT, Role.ADMIN);
  if (!user) redirect("/login");

  if (!user.groupId) {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Зачтено по лабораторным работам</h1>
        <p className="text-muted-foreground">Вы не добавлены ни в одну группу.</p>
      </div>
    );
  }

  const assignments = await prisma.assignment.findMany({
    where: { groupId: user.groupId },
    include: {
      subject: true,
      lessons: {
        // Лабораторные работы + любые уроки практических предметов (там каждый урок — лаба).
        where: {
          OR: [{ type: "лабораторная" }, { assignment: { subject: { isPractical: true } } }],
        },
        orderBy: { date: "asc" },
        include: {
          grades: { where: { studentId: user.id } },
        },
      },
    },
    orderBy: { subject: { name: "asc" } },
  });

  const labData = assignments
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

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Зачтено по лабораторным работам</h1>

      <div className="overflow-auto rounded-lg border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="px-4 py-2 text-left font-medium">Предмет</th>
              <th className="px-4 py-2 text-left font-medium">Лабораторные работы</th>
              <th className="px-3 py-2 text-center font-medium">Сдано</th>
              <th className="px-3 py-2 text-center font-medium">Не зачтено</th>
              <th className="px-3 py-2 text-center font-medium">Выдано</th>
              <th className="px-3 py-2 text-center font-medium">Всего</th>
            </tr>
          </thead>
          <tbody>
            {labData.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Лабораторные работы не найдены
                </td>
              </tr>
            )}
            {labData.map((row) => {
              const stats = labStats(row.labs);
              const groups = {
                passed: row.labs.filter((l) => labStatus(l.grade, l.date, l.deadline) === "passed"),
                failing: row.labs.filter((l) => labStatus(l.grade, l.date, l.deadline) === "failing"),
                paid: row.labs.filter((l) => labStatus(l.grade, l.date, l.deadline) === "paid"),
                pending: row.labs.filter((l) => labStatus(l.grade, l.date, l.deadline) === "pending"),
              };
              return (
                <tr key={row.subject} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-2 font-medium align-top">{row.subject}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-2">
                      {row.labs.map((lab) => {
                        const status = labStatus(lab.grade, lab.date, lab.deadline);
                        return (
                          <div key={lab.id} className="flex items-center gap-1.5 rounded-md border bg-muted/30 px-2 py-1">
                            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{fmtDate(lab.date)}</span>
                            {status === "passed" ? (
                              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-green-600 dark:text-green-400">Зачтено</span>
                            ) : status === "paid" ? (
                              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">Платная</span>
                            ) : lab.grade ? (
                              <span className="font-mono text-[11px] font-bold tabular-nums text-red-500">{lab.grade}</span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground/30">·</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center align-top tabular-nums font-semibold text-green-600 dark:text-green-400">
                    {stats.passed}
                  </td>
                  <td className="px-3 py-2 text-center align-top tabular-nums font-semibold">
                    {stats.notPassed > 0 ? (
                      <span className="text-red-600 dark:text-red-400">{stats.notPassed}</span>
                    ) : (
                      <span className="text-muted-foreground/30">0</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center align-top tabular-nums text-muted-foreground">
                    {stats.issued}
                  </td>
                  <td className="px-3 py-2 text-center align-top tabular-nums font-semibold">
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
