import { prisma } from "@/lib/prisma";
import { translate } from "@/lib/i18n/translate";
import { requireRole } from "@/lib/demo-actor";
import { Role } from "@/lib/prisma-client";
import { logAction } from "@/lib/audit";
import { fromISODate } from "@/lib/week";

async function checkTeacher() {
  const user = await requireRole(Role.TEACHER, Role.ADMIN);
  if (!user) throw new Error(translate("errors.accessDenied"));
  return user;
}

export async function createExtraLesson(data: {
  date: string;
  lessonNumber: number;
  room: string;
  comment?: string;
  groupId?: string;
}) {
  const actor = await checkTeacher();
  const dateObj = fromISODate(data.date);

  const lesson = await prisma.extraLesson.create({
    data: {
      teacherId: actor.id,
      date: dateObj,
      lessonNumber: data.lessonNumber,
      room: data.room,
      comment: data.comment ?? null,
      groupId: data.groupId ?? null,
    },
  });

  await logAction({
    userId: actor.id,
    action: "CREATE_EXTRA_LESSON",
    entity: "extra_lesson",
    entityId: lesson.id,
    meta: { date: data.date, lessonNumber: data.lessonNumber, room: data.room, groupId: data.groupId },
  });

  // The full system sends a push notification to the affected students here.
  // The demo has no server to send from, so the extra lesson simply appears in
  // their timetable.
}

export async function deleteExtraLesson(id: string) {
  const actor = await checkTeacher();

  const lesson = await prisma.extraLesson.findUnique({ where: { id } });
  if (!lesson) throw new Error(translate("errors.extraLessonNotFound"));
  if (lesson.teacherId !== actor.id && actor.role !== Role.ADMIN) {
    throw new Error(translate("errors.noDeleteRights"));
  }

  await prisma.extraLesson.delete({ where: { id } });

  await logAction({
    userId: actor.id,
    action: "DELETE_EXTRA_LESSON",
    entity: "extra_lesson",
    entityId: id,
    meta: {},
  });
}

export async function toggleExtraLessonRsvp(extraLessonId: string): Promise<boolean> {
  const actor = await requireRole(Role.STUDENT, Role.ADMIN);
  if (!actor) throw new Error(translate("errors.accessDenied"));

  const existing = await prisma.extraLessonRsvp.findUnique({
    where: { extraLessonId_studentId: { extraLessonId, studentId: actor.id } },
  });

  if (existing) {
    await prisma.extraLessonRsvp.delete({ where: { id: existing.id } });
    return false;
  } else {
    await prisma.extraLessonRsvp.create({
      data: { extraLessonId, studentId: actor.id },
    });
    return true;
  }
}

export async function getExtraLessonRsvps(extraLessonId: string) {
  const actor = await checkTeacher();

  const lesson = await prisma.extraLesson.findUnique({ where: { id: extraLessonId } });
  if (!lesson || (lesson.teacherId !== actor.id && actor.role !== Role.ADMIN)) {
    throw new Error(translate("errors.noRights"));
  }

  return prisma.extraLessonRsvp.findMany({
    where: { extraLessonId },
    include: {
      student: {
        select: { id: true, name: true, group: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}
