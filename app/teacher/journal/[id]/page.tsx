import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Role } from "@/lib/prisma-client";
import { JournalView } from "@/components/teacher/journal-view";
import { getCurrentSemesterId } from "@/lib/semester";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ semester?: string }>;
}

export default async function JournalPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { semester: semesterParam } = await searchParams;

  const user = await requireRole(Role.TEACHER, Role.ADMIN);
  if (!user) redirect("/login");

  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: {
      subject: true,
      group: { include: { students: { orderBy: { name: "asc" } } } },
      teachers: { select: { name: true, id: true } },
    },
  });

  if (!assignment) notFound();

  const isCurator = assignment.group.curatorId === user.id;
  const isOwner = assignment.teachers.some((t) => t.id === user.id) || user.role === Role.ADMIN;
  if (!isOwner && !isCurator) redirect("/teacher");

  const readonly = isCurator && !isOwner;

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

  // Hours count only for the semester they were set in.
  const plannedHours =
    assignment.subject.hoursSemesterId === activeSemesterId
      ? assignment.subject.hours
      : null;

  return (
    <JournalView
      assignment={assignment}
      semesters={semesters}
      lessons={lessons}
      grades={grades}
      activeSemesterId={activeSemesterId}
      readonly={readonly}
      assignmentId={id}
      plannedHours={plannedHours}
      labsTotal={assignment.labsTotal}
    />
  );
}
