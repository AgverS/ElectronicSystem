"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Role } from "@/lib/prisma-client";
import { logAction } from "@/lib/audit";
import { fromISODate } from "@/lib/week";
import { sendPushNotifications } from "@/lib/push";

async function checkTeacher() {
  const user = await requireRole(Role.TEACHER, Role.ADMIN);
  if (!user) throw new Error("Доступ запрещён");
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

  revalidatePath("/teacher/schedule");
  revalidatePath("/student/schedule");

  const notifTitle = "Дополнительное занятие";
  const notifBody = `${actor.name} — урок ${data.lessonNumber} (${data.date}), каб. ${data.room}`;

  if (data.groupId) {
    await sendPushNotifications(
      { groupId: data.groupId },
      { title: notifTitle, body: notifBody, url: "/student/schedule", tag: `extra-lesson-${lesson.id}` },
    );
  } else {
    const assignments = await prisma.assignment.findMany({
      where: { teachers: { some: { id: actor.id } } },
      select: { groupId: true },
      distinct: ["groupId"],
    });
    await Promise.allSettled(
      assignments.map((a) =>
        sendPushNotifications(
          { groupId: a.groupId },
          { title: notifTitle, body: notifBody, url: "/student/schedule", tag: `extra-lesson-${lesson.id}` },
        ),
      ),
    );
  }
}

export async function deleteExtraLesson(id: string) {
  const actor = await checkTeacher();

  const lesson = await prisma.extraLesson.findUnique({ where: { id } });
  if (!lesson) throw new Error("Занятие не найдено");
  if (lesson.teacherId !== actor.id && actor.role !== Role.ADMIN) {
    throw new Error("Нет прав для удаления");
  }

  await prisma.extraLesson.delete({ where: { id } });

  await logAction({
    userId: actor.id,
    action: "DELETE_EXTRA_LESSON",
    entity: "extra_lesson",
    entityId: id,
    meta: {},
  });

  revalidatePath("/teacher/schedule");
  revalidatePath("/student/schedule");
}

export async function toggleExtraLessonRsvp(extraLessonId: string): Promise<boolean> {
  const actor = await requireRole(Role.STUDENT, Role.ADMIN);
  if (!actor) throw new Error("Доступ запрещён");

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
    throw new Error("Нет прав");
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
