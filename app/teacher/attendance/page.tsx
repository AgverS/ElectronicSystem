"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ABSENT } from "@/lib/grades";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/prisma-client";
import { getAdminScope } from "@/lib/actions/admin";
import { AttendanceSheet } from "@/components/teacher/attendance-sheet";
import { PageLoading } from "@/components/ui/page-state";
import { useDemoUser } from "@/lib/demo-session";
import { useDemoData } from "@/lib/use-demo-data";
import { useI18n, useT } from "@/lib/i18n/provider";

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const PRINT_STYLES = `
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

export default function AttendancePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AttendancePageContent />
    </Suspense>
  );
}

function AttendancePageContent() {
  const user = useDemoUser();
  const t = useT();
  const { intlLocale } = useI18n();

  // AttendanceControls navigates with ?groupId=&month=, so the selection lives
  // in the URL and a particular sheet can be linked to directly.
  const searchParams = useSearchParams();
  const monthParam = searchParams.get("month");
  const month = /^\d{4}-\d{2}$/.test(monthParam ?? "") ? monthParam! : currentMonthValue();
  const selectedGroupId = searchParams.get("groupId");

  const { data, loading } = useDemoData(
    ["teacher-attendance", user?.id, month, selectedGroupId],
    async () => {
      if (!user) return null;

      const scope = user.role === Role.ADMIN ? await getAdminScope(user.id) : null;
      const isMaster = scope?.isMaster ?? user.isMaster;
      const scopeIds = scope?.specialtyIds ?? [];
      const isPrivileged = user.role === Role.ADMIN || isMaster;

      // A teacher sees the groups they curate; an administrator sees the groups
      // within their specialties. This scoping is what the real system does.
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

      const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? groups[0] ?? null;
      if (!selectedGroup) return { groups, selectedGroup: null, isPrivileged };

      const [year, mon] = month.split("-").map(Number);
      const daysInMonth = new Date(Date.UTC(year, mon, 0)).getUTCDate();
      const monthStart = new Date(Date.UTC(year, mon - 1, 1));
      const monthEnd = new Date(Date.UTC(year, mon - 1, daysInMonth, 23, 59, 59));
      const monthLabel = new Intl.DateTimeFormat(intlLocale, {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(monthStart);

      const groupWithCurator = await prisma.group.findUnique({
        where: { id: selectedGroup.id },
        select: { curatorId: true, curator: { select: { name: true } } },
      });

      // Only the group's curator (or an administrator) may mark an absence excused.
      const canEdit =
        user.role === Role.ADMIN || user.isMaster || groupWithCurator?.curatorId === user.id;

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

      // studentId -> absences per day, indexed 1..daysInMonth
      const counts = new Map<string, number[]>();
      for (const s of students) counts.set(s.id, new Array(daysInMonth + 1).fill(0));
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

      const excusedRecords = students.length
        ? await prisma.excusedAbsence.findMany({
            where: {
              studentId: { in: students.map((s) => s.id) },
              date: { gte: monthStart, lte: monthEnd },
            },
            select: { studentId: true, date: true },
          })
        : [];

      return {
        groups,
        selectedGroup,
        isPrivileged,
        daysInMonth,
        monthLabel,
        curatorName: groupWithCurator?.curator?.name ?? null,
        canEdit,
        studentRows,
        initialExcused: excusedRecords.map((e) => `${e.studentId}:${e.date.getUTCDate()}`),
      };
    },
    { enabled: !!user },
  );

  if (loading || !data) return <PageLoading />;

  if (!data.selectedGroup) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight">{t("nav.attendanceReport")}</h1>
        <p className="text-muted-foreground">{t("attendance.noGroups")}</p>
      </div>
    );
  }

  return (
    <>
      <style>{PRINT_STYLES}</style>
      <AttendanceSheet
        groups={data.groups}
        groupId={data.selectedGroup.id}
        groupName={data.selectedGroup.name}
        month={month}
        monthLabel={data.monthLabel!}
        curatorName={data.curatorName!}
        daysInMonth={data.daysInMonth!}
        canEdit={data.canEdit!}
        showGroupSelect={data.isPrivileged || data.groups.length > 1}
        students={data.studentRows!}
        initialExcused={data.initialExcused!}
      />
    </>
  );
}
