import { redirect } from "next/navigation";
import { ABSENT } from "@/lib/grades";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/prisma-client";
import { getAdminScope } from "@/lib/actions/admin";
import { AttendanceSheet } from "@/components/teacher/attendance-sheet";

const MONTH_NAMES = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

function currentMonthValue() {
  const now = new Date();
  return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
}

interface PageProps {
  searchParams: Promise<{ groupId?: string; month?: string }>;
}

export default async function AttendancePage({ searchParams }: PageProps) {
  const user = await requireRole(Role.TEACHER, Role.ADMIN);
  if (!user) redirect("/login");

  const { groupId: groupParam, month: monthParam } = await searchParams;

  const scope = user.role === Role.ADMIN ? await getAdminScope(user.id) : null;
  const isMaster = scope?.isMaster ?? user.isMaster;
  const scopeIds = scope?.specialtyIds ?? [];
  const isPrivileged = user.role === Role.ADMIN || isMaster;

  const groups = isMaster
    ? await prisma.group.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : user.role === Role.ADMIN && scopeIds.length > 0
      ? await prisma.group.findMany({
          where: { specialtyId: { in: scopeIds } },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : await prisma.group.findMany({
          where: { curatorId: user.id },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        });

  const month = /^\d{4}-\d{2}$/.test(monthParam ?? "")
    ? (monthParam as string)
    : currentMonthValue();
  const [year, mon] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  const monthStart = new Date(Date.UTC(year, mon - 1, 1));
  const monthEnd = new Date(Date.UTC(year, mon - 1, daysInMonth, 23, 59, 59));
  const monthLabel = MONTH_NAMES[mon - 1] + " " + year;

  // Выбранная группа обязана быть в списке доступных - так доступ ограничен на сервере
  const selectedGroup =
    groups.find((g) => g.id === groupParam) ?? groups[0] ?? null;

  const printStyles = `
    @media print {
      .no-print { display: none !important; }
      .attendance-table th,
      .attendance-table td {
        position: static !important;
        background: white !important;
      }
      .attendance-overflow { overflow: visible !important; }
      tr { break-inside: avoid; }
      @page { size: A4 landscape; margin: 15mm; }
    }
  `;

  if (!selectedGroup) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Ведомость пропусков</h1>
        <p className="text-muted-foreground">Нет доступных групп.</p>
      </div>
    );
  }

  const groupWithCurator = await prisma.group.findUnique({
    where: { id: selectedGroup.id },
    select: { curatorId: true, curator: { select: { name: true } } },
  });
  const curatorName = groupWithCurator?.curator?.name ?? null;

  // Отмечать уважительность пропусков может только куратор группы (и админ/мастер).
  const canEdit =
    user.role === Role.ADMIN ||
    user.isMaster ||
    groupWithCurator?.curatorId === user.id;

  const students = await prisma.user.findMany({
    where: { groupId: selectedGroup.id, role: Role.STUDENT },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const assignments = await prisma.assignment.findMany({
    where: { groupId: selectedGroup.id },
    select: { id: true },
  });
  const assignmentIds = assignments.map((a) => a.id);

  const lessons = assignmentIds.length
    ? await prisma.lesson.findMany({
      where: {
        assignmentId: { in: assignmentIds },
        date: { gte: monthStart, lte: monthEnd },
      },
      select: { id: true, date: true },
    })
    : [];
  const lessonDay = new Map(lessons.map((l) => [l.id, l.date.getUTCDate()]));

  const absences =
    lessons.length && students.length
      ? await prisma.grade.findMany({
        where: {
          lessonId: { in: lessons.map((l) => l.id) },
          studentId: { in: students.map((s) => s.id) },
          value: ABSENT,
        },
        select: { studentId: true, lessonId: true },
      })
      : [];

  // Матрица: studentId -> массив по дням (индексы 1..daysInMonth)
  const counts = new Map<string, number[]>();
  for (const s of students)
    counts.set(s.id, new Array(daysInMonth + 1).fill(0));
  for (const a of absences) {
    const day = lessonDay.get(a.lessonId);
    if (!day) continue;
    const row = counts.get(a.studentId);
    if (row) row[day] += 1;
  }

  const studentRows = students.map((s, idx) => ({
    id: s.id,
    idx: idx + 1,
    name: s.name,
    perDay: counts.get(s.id)!,
  }));

  // Уважительные дни: ключи `${studentId}:${day}`.
  const excusedRecords = students.length
    ? await prisma.excusedAbsence.findMany({
      where: {
        studentId: { in: students.map((s) => s.id) },
        date: { gte: monthStart, lte: monthEnd },
      },
      select: { studentId: true, date: true },
    })
    : [];
  const initialExcused = excusedRecords.map(
    (e) => `${e.studentId}:${e.date.getUTCDate()}`,
  );

  return (
    <>
      <style>{printStyles}</style>
      <AttendanceSheet
        groups={groups}
        groupId={selectedGroup.id}
        groupName={selectedGroup.name}
        month={month}
        monthLabel={monthLabel}
        curatorName={curatorName}
        daysInMonth={daysInMonth}
        canEdit={canEdit}
        showGroupSelect={isPrivileged || groups.length > 1}
        students={studentRows}
        initialExcused={initialExcused}
      />
    </>
  );
}
