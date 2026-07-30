import { prisma } from "@/lib/prisma";
import { ABSENT } from "@/lib/grades";
import { translate } from "@/lib/i18n/translate";
import { requireRole } from "@/lib/demo-actor";
import { Role } from "@/lib/prisma-client";
import { logAction } from "@/lib/audit";
import { getCurrentSemesterId } from "@/lib/semester";

async function checkTeacher() {
  const user = await requireRole(Role.TEACHER, Role.ADMIN);
  if (!user) throw new Error(translate("errors.accessDenied"));
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
      translate("errors.pastSemesterReadOnly"),
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
    throw new Error(translate("errors.createSemesterFirst"));

  const semester = await prisma.semester.findUnique({
    where: { id: currentSemesterId },
  });
  if (!semester) throw new Error(translate("errors.semesterNotFound"));

  const lessonDate = new Date(data.date);
  if (lessonDate < semester.startDate || lessonDate > semester.endDate) {
    throw new Error(translate("errors.lessonDateOutsideSemester"));
  }

  if (teacher.role === Role.TEACHER) {
    const assignment = await prisma.assignment.findFirst({
      where: { id: data.assignmentId, teachers: { some: { id: teacher.id } } },
    });
    if (!assignment) throw new Error(translate("errors.assignmentNotFound"));
  }

  // Several lessons (columns) can be created for a single date at once.
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
  if (!assignment) throw new Error(translate("errors.assignmentNotFound"));
  if (teacher.role === Role.TEACHER && !assignment.teachers.some((t) => t.id === teacher.id)) {
    throw new Error(translate("errors.accessDenied"));
  }

  let hours = data.hours;
  if (hours != null) {
    if (!Number.isInteger(hours) || hours < 0) {
      throw new Error(
        translate("errors.hoursInvalid"),
      );
    }
    if (hours === 0) hours = null;
  }

  // Hours apply only to the current semester; stamp it so they reset next one.
  const semesterId = hours == null ? null : await getCurrentSemesterId();
  if (hours != null && !semesterId) {
    throw new Error(translate("errors.createSemesterFirst"));
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
}

// The planned total of laboratory works for a group and subject. Set by the
// assigned teacher or an administrator.
export async function setLabsTotal(data: {
  assignmentId: string;
  total: number | null;
}) {
  const teacher = await checkTeacher();

  const assignment = await prisma.assignment.findUnique({
    where: { id: data.assignmentId },
    select: { teachers: { select: { id: true } } },
  });
  if (!assignment) throw new Error(translate("errors.assignmentNotFound"));
  if (teacher.role === Role.TEACHER && !assignment.teachers.some((t) => t.id === teacher.id)) {
    throw new Error(translate("errors.accessDenied"));
  }

  let total = data.total;
  if (total != null) {
    if (!Number.isInteger(total) || total < 0) {
      throw new Error(translate("errors.labsTotalInvalid"));
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
}

// A laboratory work's deadline: YYYY-MM-DD to extend it, or null to reset it to
// the lesson date plus 14 days.
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
  if (!lesson) throw new Error(translate("errors.lessonNotFound"));
  if (
    user.role === Role.TEACHER &&
    !lesson.assignment.teachers.some((t) => t.id === user.id)
  ) {
    throw new Error(translate("errors.accessDenied"));
  }

  let deadline: Date | null = null;
  if (data.deadline) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.deadline)) {
      throw new Error(translate("errors.invalidDate"));
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
  if (existing.length === 0) throw new Error(translate("errors.noGradeToRetake"));
  const maxRetake = existing[0].retakeNumber;
  if (maxRetake >= 3) throw new Error(translate("errors.maxRetakes"));

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
    // More than 23 minutes late is recorded as an absence;
    // 23 minutes or fewer clears an absence that was set for that reason.
    let value = existing?.value || "";
    if (data.lateness > 23) {
      value = ABSENT;
    } else if (value === ABSENT) {
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
}

// The curator marks all of a student's absences for one day as excused, or
// clears that mark. Only the group's curator and administrators may do this.
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
  if (!group) throw new Error(translate("ui.groupNotFound"));
  if (
    user.role !== Role.ADMIN &&
    !user.isMaster &&
    group.curatorId !== user.id
  ) {
    throw new Error(translate("errors.onlyCuratorMarksAbsence"));
  }

  const student = await prisma.user.findFirst({
    where: { id: data.studentId, groupId: data.groupId, role: Role.STUDENT },
    select: { id: true },
  });
  if (!student) throw new Error(translate("errors.studentNotInGroup"));

  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) throw new Error(translate("errors.invalidDate"));
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
}

export async function updateLessonTopic(lessonId: string, topic: string) {
  const user = await checkTeacher();
  await checkCurrentSemester(lessonId);
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { assignment: { include: { teachers: { select: { id: true } } } } },
  });
  if (!lesson) throw new Error(translate("errors.lessonNotFound"));
  if (user.role === Role.TEACHER && !lesson.assignment.teachers.some((t) => t.id === user.id)) {
    throw new Error(translate("errors.accessDenied"));
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
    if (!assignment) throw new Error(translate("errors.noAccessToGroup"));
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
