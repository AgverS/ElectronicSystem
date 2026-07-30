"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/prisma-client";
import { JournalView } from "@/components/teacher/journal-view";
import { PageLoading, EmptyState } from "@/components/ui/page-state";
import { getCurrentSemesterId } from "@/lib/semester";
import { useDemoUser } from "@/lib/demo-session";
import { useDemoData } from "@/lib/use-demo-data";
import { useT } from "@/lib/i18n/provider";

/**
 * The journal is addressed by query string rather than a path segment: the demo
 * is a static export, and a journal created while the visitor is browsing has
 * an id that could not have been prerendered.
 */
export default function JournalPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <JournalPageContent />
    </Suspense>
  );
}

function JournalPageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const semesterParam = searchParams.get("semester");
  const forcedReadonly = searchParams.get("readonly") === "1";

  const user = useDemoUser();
  const t = useT();

  const { data, loading } = useDemoData(
    ["teacher-journal", id, user?.id, semesterParam],
    async () => {
      if (!id || !user) return null;

      const assignment = await prisma.assignment.findUnique({
        where: { id },
        include: {
          subject: true,
          group: { include: { students: { orderBy: { name: "asc" } } } },
          teachers: { select: { name: true, id: true } },
        },
      });
      if (!assignment) return { notFound: true as const };

      const isCurator = assignment.group.curatorId === user.id;
      const isOwner =
        assignment.teachers.some((teacher) => teacher.id === user.id) ||
        user.role === Role.ADMIN;
      if (!isOwner && !isCurator) return { forbidden: true as const };

      const currentSemesterId = await getCurrentSemesterId();
      const activeSemesterId = semesterParam ?? currentSemesterId ?? undefined;

      const semesters = await prisma.semester.findMany({
        where: {
          OR: [
            { lessons: { some: { assignmentId: id, grades: { some: {} } } } },
            ...(currentSemesterId ? [{ id: currentSemesterId }] : []),
          ],
        },
        orderBy: [{ year: "desc" }, { number: "desc" }],
      });

      const lessons = await prisma.lesson.findMany({
        where: { assignmentId: id, semesterId: activeSemesterId ?? "" },
        orderBy: { date: "asc" },
      });

      const grades = await prisma.grade.findMany({
        where: { lessonId: { in: lessons.map((l) => l.id) } },
      });

      return {
        assignment,
        semesters,
        lessons,
        grades,
        activeSemesterId,
        // A curator may read a journal they do not teach, but not change it.
        readonly: forcedReadonly || (isCurator && !isOwner),
        // Planned hours count only for the semester they were set in.
        plannedHours:
          assignment.subject.hoursSemesterId === activeSemesterId
            ? assignment.subject.hours
            : null,
      };
    },
    { enabled: !!user },
  );

  if (loading) return <PageLoading />;
  if (!id || !data || "notFound" in data) return <EmptyState title={t("journal.notFound")} />;
  if ("forbidden" in data) return <EmptyState title={t("errors.accessDenied")} />;

  return (
    <JournalView
      assignment={data.assignment}
      semesters={data.semesters}
      lessons={data.lessons}
      grades={data.grades}
      activeSemesterId={data.activeSemesterId}
      readonly={data.readonly}
      assignmentId={id}
      plannedHours={data.plannedHours}
      labsTotal={data.assignment.labsTotal}
    />
  );
}
