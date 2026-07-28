"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Role } from "@/lib/prisma-client";
import { logAction } from "@/lib/audit";
import { getCurrentSemesterId } from "@/lib/semester";

async function checkTeacher() {
  const user = await requireRole(Role.TEACHER, Role.ADMIN);
  if (!user) throw new Error("Доступ запрещён");
  return user;
}

async function checkCurrentSemester(lessonId: string) {
  const currentId = await getCurrentSemesterId();
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { semesterId: true },
  });
  if (!lesson || lesson.semesterId !== currentId) {
    throw new Error(
      "Редактирование уроков в закончившихся семестрах запрещено",
    );
  }
}

export async function addLesson(data: {
  assignmentId: string;
  date: string;
  type: string;
  topic?: string;
  count?: number;
}) {
  const teacher = await checkTeacher();

  const count = Math.min(Math.max(1, Math.floor(data.count ?? 1)), 20);

  const currentSemesterId = await getCurrentSemesterId();
  if (!currentSemesterId)
    throw new Error("Сначала создайте семестр в разделе «Семестры»");

  const semester = await prisma.semester.findUnique({
    where: { id: currentSemesterId },
  });
  if (!semester) throw new Error("Семестр не найден");

  const lessonDate = new Date(data.date);
  if (lessonDate < semester.startDate || lessonDate > semester.endDate) {
    throw new Error("Дата урока должна быть в пределах текущего семестра");
  }

  if (teacher.role === Role.TEACHER) {
    const assignment = await prisma.assignment.findFirst({
      where: { id: data.assignmentId, teachers: { some: { id: teacher.id } } },
    });
    if (!assignment) throw new Error("Назначение не найдено");
  }

  // Можно создать сразу несколько уроков (колонок) на одну дату.
  const createdIds: string[] = [];
  for (let i = 0; i < count; i++) {
    const lesson = await prisma.lesson.create({
      data: {
        date: new Date(data.date),
        topic: data.topic ?? null,
        type: data.type,
        assignmentId: data.assignmentId,
        semesterId: currentSemesterId,
      },
    });
    createdIds.push(lesson.id);
  }

  await logAction({
    userId: teacher.id,
    action: "CREATE_LESSON",
    entity: "lesson",
    entityId: createdIds[0],
    meta: {
      date: data.date,
      type: data.type,
      topic: data.topic ?? null,
      count,
      assignmentId: data.assignmentId,
      semesterId: currentSemesterId,
    },
  });
  revalidatePath(`/teacher/journal/${data.assignmentId}`);
}

export async function deleteLesson(lessonId: string, assignmentId: string) {
  const teacher = await checkTeacher();
  await checkCurrentSemester(lessonId);
  await prisma.lesson.delete({ where: { id: lessonId } });
  await logAction({
    userId: teacher.id,
    action: "DELETE_LESSON",
    entity: "lesson",
    entityId: lessonId,
    meta: { assignmentId },
  });
  revalidatePath(`/teacher/journal/${assignmentId}`);
}

// Hours live on the subject. A teacher may change them for a subject they
// teach; admins for any. Editable from the journal, where assignmentId is known.
export async function setSubjectHours(data: {
  assignmentId: string;
  hours: number | null;
}) {
  const teacher = await checkTeacher();

  const assignment = await prisma.assignment.findUnique({
    where: { id: data.assignmentId },
    select: { subjectId: true, teachers: { select: { id: true } } },
  });
  if (!assignment) throw new Error("Назначение не найдено");
  if (teacher.role === Role.TEACHER && !assignment.teachers.some((t) => t.id === teacher.id)) {
    throw new Error("Доступ запрещён");
  }

  let hours = data.hours;
  if (hours != null) {
    if (!Number.isInteger(hours) || hours < 0) {
      throw new Error(
        "Количество часов должно быть целым неотрицательным числом",
      );
    }
    if (hours === 0) hours = null;
  }

  // Hours apply only to the current semester; stamp it so they reset next one.
  const semesterId = hours == null ? null : await getCurrentSemesterId();
  if (hours != null && !semesterId) {
    throw new Error("Сначала создайте семестр в разделе «Семестры»");
  }

  await prisma.subject.update({
    where: { id: assignment.subjectId },
    data: { hours, hoursSemesterId: semesterId },
  });
  await logAction({
    userId: teacher.id,
    action: "SET_SUBJECT_HOURS",
    entity: "subject",
    entityId: assignment.subjectId,
    meta: { hours, semesterId, assignmentId: data.assignmentId },
  });
  revalidatePath(`/teacher/journal/${data.assignmentId}`);
  revalidatePath(`/admin/journals/${data.assignmentId}`);
  revalidatePath("/admin/subjects");
}

// План «всего лабораторных работ» по группе+предмету. Правит владелец-препод/админ.
export async function setLabsTotal(data: {
  assignmentId: string;
  total: number | null;
}) {
  const teacher = await checkTeacher();

  const assignment = await prisma.assignment.findUnique({
    where: { id: data.assignmentId },
    select: { teachers: { select: { id: true } } },
  });
  if (!assignment) throw new Error("Назначение не найдено");
  if (teacher.role === Role.TEACHER && !assignment.teachers.some((t) => t.id === teacher.id)) {
    throw new Error("Доступ запрещён");
  }

  let total = data.total;
  if (total != null) {
    if (!Number.isInteger(total) || total < 0) {
      throw new Error("Количество лаб должно быть целым неотрицательным числом");
    }
    if (total === 0) total = null;
  }

  await prisma.assignment.update({
    where: { id: data.assignmentId },
    data: { labsTotal: total },
  });
  await logAction({
    userId: teacher.id,
    action: "SET_LABS_TOTAL",
    entity: "assignment",
    entityId: data.assignmentId,
    meta: { total },
  });
  revalidatePath(`/teacher/journal/${data.assignmentId}`);
  revalidatePath(`/admin/journals/${data.assignmentId}`);
}

// Срок сдачи лабы. deadline = YYYY-MM-DD (продлить) или null (сброс к +14 дней).
export async function setLabDeadline(data: {
  lessonId: string;
  deadline: string | null;
  assignmentId: string;
}) {
  const user = await checkTeacher();
  await checkCurrentSemester(data.lessonId);

  const lesson = await prisma.lesson.findUnique({
    where: { id: data.lessonId },
    include: { assignment: { select: { teachers: { select: { id: true } } } } },
  });
  if (!lesson) throw new Error("Урок не найден");
  if (
    user.role === Role.TEACHER &&
    !lesson.assignment.teachers.some((t) => t.id === user.id)
  ) {
    throw new Error("Доступ запрещён");
  }

  let deadline: Date | null = null;
  if (data.deadline) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.deadline)) {
      throw new Error("Неверная дата");
    }
    deadline = new Date(data.deadline + "T00:00:00.000Z");
  }

  await prisma.lesson.update({
    where: { id: data.lessonId },
    data: { deadline },
  });
  await logAction({
    userId: user.id,
    action: "SET_LAB_DEADLINE",
    entity: "lesson",
    entityId: data.lessonId,
    meta: { deadline: data.deadline, assignmentId: data.assignmentId },
  });
  revalidatePath(`/teacher/journal/${data.assignmentId}`);
  revalidatePath(`/admin/journals/${data.assignmentId}`);
}

export async function saveGrade(data: {
  lessonId: string;
  studentId: string;
  value: string;
  assignmentId: string;
  retakeNumber: number;
}) {
  const teacher = await checkTeacher();
  await checkCurrentSemester(data.lessonId);
  const uniqueKey = {
    lessonId_studentId_retakeNumber: {
      lessonId: data.lessonId,
      studentId: data.studentId,
      retakeNumber: data.retakeNumber,
    },
  };
  if (data.value === "") {
    const existing = await prisma.grade.findUnique({
      where: uniqueKey,
      select: { value: true },
    });
    if (data.retakeNumber === 0) {
      // Clearing base grade removes all retakes too
      await prisma.grade.deleteMany({
        where: { lessonId: data.lessonId, studentId: data.studentId },
      });
    } else {
      await prisma.grade.delete({ where: uniqueKey });
    }
    await logAction({
      userId: teacher.id,
      action: "DELETE_GRADE",
      entity: "grade",
      meta: {
        lessonId: data.lessonId,
        studentId: data.studentId,
        retakeNumber: data.retakeNumber,
        before: existing?.value ?? null,
      },
    });
  } else {
    const existing = await prisma.grade.findUnique({
      where: uniqueKey,
      select: { value: true },
    });
    await prisma.grade.upsert({
      where: uniqueKey,
      update: { value: data.value },
      create: {
        lessonId: data.lessonId,
        studentId: data.studentId,
        retakeNumber: data.retakeNumber,
        value: data.value,
      },
    });
    await logAction({
      userId: teacher.id,
      action: "UPSERT_GRADE",
      entity: "grade",
      meta: {
        lessonId: data.lessonId,
        studentId: data.studentId,
        retakeNumber: data.retakeNumber,
        value: data.value,
        before: existing?.value ?? null,
        isNew: !existing,
      },
    });
  }
  revalidatePath(`/teacher/journal/${data.assignmentId}`);
}

export async function addRetake(data: {
  lessonId: string;
  studentId: string;
  assignmentId: string;
}): Promise<number> {
  const teacher = await checkTeacher();
  await checkCurrentSemester(data.lessonId);

  const existing = await prisma.grade.findMany({
    where: { lessonId: data.lessonId, studentId: data.studentId },
    orderBy: { retakeNumber: "desc" },
    take: 1,
  });
  if (existing.length === 0) throw new Error("Нет исходной оценки для пересдачи");
  const maxRetake = existing[0].retakeNumber;
  if (maxRetake >= 3) throw new Error("Достигнут максимум пересдач (3)");

  const newRetakeNumber = maxRetake + 1;
  await prisma.grade.create({
    data: {
      lessonId: data.lessonId,
      studentId: data.studentId,
      retakeNumber: newRetakeNumber,
      value: "",
    },
  });
  await logAction({
    userId: teacher.id,
    action: "ADD_RETAKE",
    entity: "grade",
    meta: {
      lessonId: data.lessonId,
      studentId: data.studentId,
      retakeNumber: newRetakeNumber,
      assignmentId: data.assignmentId,
    },
  });
  revalidatePath(`/teacher/journal/${data.assignmentId}`);
  revalidatePath(`/admin/journals/${data.assignmentId}`);
  return newRetakeNumber;
}

export async function saveLateness(data: {
  lessonId: string;
  studentId: string;
  lateness: number | null;
  assignmentId: string;
}) {
  const teacher = await checkTeacher();
  await checkCurrentSemester(data.lessonId);
  const baseKey = {
    lessonId_studentId_retakeNumber: {
      lessonId: data.lessonId,
      studentId: data.studentId,
      retakeNumber: 0,
    },
  };
  const existing = await prisma.grade.findUnique({ where: baseKey });

  if (data.lateness === null) {
    if (existing) {
      await prisma.grade.update({
        where: { id: existing.id },
        data: { lateness: null },
      });
    }
  } else {
    // Автоматически ставить Н, если опоздание более 23 минут
    // Если опоздание <= 23 и стояло Н, то убираем Н
    let value = existing?.value || "";
    if (data.lateness > 23) {
      value = "Н";
    } else if (value === "Н") {
      value = "";
    }

    await prisma.grade.upsert({
      where: baseKey,
      update: { lateness: data.lateness, value },
      create: {
        lessonId: data.lessonId,
        studentId: data.studentId,
        retakeNumber: 0,
        lateness: data.lateness,
        value,
      },
    });
  }

  await logAction({
    userId: teacher.id,
    action: "SAVE_LATENESS",
    entity: "grade",
    meta: {
      lessonId: data.lessonId,
      studentId: data.studentId,
      lateness: data.lateness,
    },
  });
  revalidatePath(`/teacher/journal/${data.assignmentId}`);
}

// Куратор отмечает все пропуски учащегося за день уважительными (или снимает
// отметку). Право редактирования — только у куратора группы и админа/мастера.
export async function setAbsenceExcused(data: {
  studentId: string;
  date: string; // YYYY-MM-DD
  excused: boolean;
  groupId: string;
}) {
  const user = await checkTeacher();

  const group = await prisma.group.findUnique({
    where: { id: data.groupId },
    select: { curatorId: true },
  });
  if (!group) throw new Error("Группа не найдена");
  if (
    user.role !== Role.ADMIN &&
    !user.isMaster &&
    group.curatorId !== user.id
  ) {
    throw new Error("Отмечать пропуски может только куратор группы");
  }

  const student = await prisma.user.findFirst({
    where: { id: data.studentId, groupId: data.groupId, role: Role.STUDENT },
    select: { id: true },
  });
  if (!student) throw new Error("Учащийся не найден в группе");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) throw new Error("Неверная дата");
  const date = new Date(data.date + "T00:00:00.000Z");

  if (data.excused) {
    await prisma.excusedAbsence.upsert({
      where: { studentId_date: { studentId: data.studentId, date } },
      update: {},
      create: { studentId: data.studentId, date },
    });
  } else {
    await prisma.excusedAbsence.deleteMany({
      where: { studentId: data.studentId, date },
    });
  }

  await logAction({
    userId: user.id,
    action: "SET_ABSENCE_EXCUSED",
    entity: "excused_absence",
    meta: {
      studentId: data.studentId,
      date: data.date,
      excused: data.excused,
      groupId: data.groupId,
    },
  });
  revalidatePath("/teacher/attendance");
}

export async function updateLessonTopic(lessonId: string, topic: string) {
  const user = await checkTeacher();
  await checkCurrentSemester(lessonId);
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { assignment: { include: { teachers: { select: { id: true } } } } },
  });
  if (!lesson) throw new Error("Урок не найден");
  if (user.role === Role.TEACHER && !lesson.assignment.teachers.some((t) => t.id === user.id)) {
    throw new Error("Доступ запрещён");
  }
  await prisma.lesson.update({
    where: { id: lessonId },
    data: { topic: topic.trim() || null },
  });
  await logAction({
    userId: user.id,
    action: "UPDATE_LESSON_TOPIC",
    entity: "lesson",
    entityId: lessonId,
    meta: { before: lesson.topic, after: topic.trim() || null },
  });
  revalidatePath(`/teacher/journal/${lesson.assignmentId}`);
}

export async function addStudentToGroup(data: {
  studentId: string;
  groupId: string;
}) {
  const teacher = await checkTeacher();
  if (teacher.role === Role.TEACHER) {
    const assignment = await prisma.assignment.findFirst({
      where: { teachers: { some: { id: teacher.id } }, groupId: data.groupId },
    });
    if (!assignment) throw new Error("Нет доступа к этой группе");
  }
  const student = await prisma.user.findUnique({
    where: { id: data.studentId },
    select: { groupId: true, name: true },
  });
  await prisma.user.update({
    where: { id: data.studentId },
    data: { groupId: data.groupId },
  });
  await logAction({
    userId: teacher.id,
    action: "ADD_STUDENT_TO_GROUP",
    entity: "user",
    entityId: data.studentId,
    meta: {
      studentName: student?.name,
      studentId: data.studentId,
      groupId: data.groupId,
      previousGroupId: student?.groupId ?? null,
    },
  });
}
