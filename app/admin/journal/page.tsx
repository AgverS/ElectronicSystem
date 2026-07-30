"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { JournalView } from "@/components/teacher/journal-view";
import { PageLoading, EmptyState } from "@/components/ui/page-state";
import { getCurrentSemesterId } from "@/lib/semester";
import { useDemoUser } from "@/lib/demo-session";
import { useDemoData } from "@/lib/use-demo-data";
import { useT } from "@/lib/i18n/provider";

/** Addressed by query string — see the note on the teacher's journal page. */
export default function AdminJournalPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AdminJournalPageContent />
    </Suspense>
  );
}

function AdminJournalPageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const semesterParam = searchParams.get("semester");
  const user = useDemoUser();
  const t = useT();

  const { data, loading } = useDemoData(
    ["admin-journal", id, semesterParam],
    async () => {
      if (!id) return null;

      const assignment = await prisma.assignment.findUnique({
        where: { id },
        include: {
          subject: true,
          group: { include: { students: { orderBy: { name: "asc" } } } },
          teachers: { select: { name: true, id: true } },
        },
      });
      if (!assignment) return { notFound: true as const };

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

  return (
    <JournalView
      assignment={data.assignment}
      semesters={data.semesters}
      lessons={data.lessons}
      grades={data.grades}
      activeSemesterId={data.activeSemesterId}
      readonly={false}
      assignmentId={id}
      plannedHours={data.plannedHours}
      labsTotal={data.assignment.labsTotal}
    />
  );
}
