import { prisma } from "@/lib/prisma";
import { translate } from "@/lib/i18n/provider";
import { requireRole } from "@/lib/demo-actor";
import { Role } from "@/lib/prisma-client";
import { logAction } from "@/lib/audit";
import { fromISODate } from "@/lib/week";

async function checkAdmin() {
  const user = await requireRole(Role.ADMIN);
  if (!user) throw new Error(translate("errors.accessDenied"));
  return user;
}

export async function upsertScheduleEntry(data: {
  id?: string;
  groupId: string;
  dayOfWeek: number;
  lessonNumber: number;
  subgroup: string;
  subjectId: string;
  teacherId: string;
  room: string;
}) {
  const actor = await checkAdmin();

  if (!data.id) {
    const existing = await prisma.scheduleEntry.findUnique({
      where: {
        groupId_dayOfWeek_lessonNumber_subgroup: {
          groupId: data.groupId,
          dayOfWeek: data.dayOfWeek,
          lessonNumber: data.lessonNumber,
          subgroup: data.subgroup,
        },
      },
    });
    if (existing) throw new Error(translate("errors.slotTaken"));
  }

  const entry = data.id
    ? await prisma.scheduleEntry.update({
      where: { id: data.id },
      data: {
        subjectId: data.subjectId,
        teacherId: data.teacherId,
        room: data.room,
        subgroup: data.subgroup,
      },
    })
    : await prisma.scheduleEntry.create({
      data: {
        groupId: data.groupId,
        dayOfWeek: data.dayOfWeek,
        lessonNumber: data.lessonNumber,
        subgroup: data.subgroup,
        subjectId: data.subjectId,
        teacherId: data.teacherId,
        room: data.room,
      },
    });

  await logAction({
    userId: actor.id,
    action: "UPSERT_SCHEDULE_ENTRY",
    entity: "schedule_entry",
    entityId: entry.id,
    meta: {
      groupId: data.groupId,
      dayOfWeek: data.dayOfWeek,
      lessonNumber: data.lessonNumber,
      subgroup: data.subgroup,
      room: data.room,
    },
  });
}

export async function getLastCreatedScheduleEntry() {
  await checkAdmin();
  return prisma.scheduleEntry.findFirst({
    orderBy: { createdAt: "desc" },
    select: {
      subjectId: true,
      teacherId: true,
      room: true,
      subgroup: true,
    },
  });
}

export async function deleteScheduleEntry(id: string) {
  const actor = await checkAdmin();

  const entry = await prisma.scheduleEntry.delete({ where: { id } });

  await logAction({
    userId: actor.id,
    action: "DELETE_SCHEDULE_ENTRY",
    entity: "schedule_entry",
    entityId: id,
    meta: {
      groupId: entry.groupId,
      dayOfWeek: entry.dayOfWeek,
      lessonNumber: entry.lessonNumber,
    },
  });
}

export async function upsertSubstitution(data: {
  groupId: string;
  date: string; // YYYY-MM-DD
  lessonNumber: number;
  subgroup?: string;
  cancelled: boolean;
  subjectId?: string;
  teacherId?: string;
  room?: string;
}) {
  const actor = await checkAdmin();

  const dateObj = fromISODate(data.date);
  const subgroup = data.subgroup ?? "";

  const sub = await prisma.scheduleSubstitution.upsert({
    where: {
      groupId_date_lessonNumber_subgroup: {
        groupId: data.groupId,
        date: dateObj,
        lessonNumber: data.lessonNumber,
        subgroup,
      },
    },
    update: {
      cancelled: data.cancelled,
      subjectId: data.cancelled ? null : (data.subjectId ?? null),
      teacherId: data.cancelled ? null : (data.teacherId ?? null),
      room: data.cancelled ? null : (data.room ?? null),
    },
    create: {
      groupId: data.groupId,
      date: dateObj,
      lessonNumber: data.lessonNumber,
      subgroup,
      cancelled: data.cancelled,
      subjectId: data.cancelled ? null : (data.subjectId ?? null),
      teacherId: data.cancelled ? null : (data.teacherId ?? null),
      room: data.cancelled ? null : (data.room ?? null),
    },
  });

  await logAction({
    userId: actor.id,
    action: "UPSERT_SUBSTITUTION",
    entity: "schedule_substitution",
    entityId: sub.id,
    meta: { groupId: data.groupId, date: data.date, lessonNumber: data.lessonNumber, subgroup, cancelled: data.cancelled },
  });

  // The full system notifies the group and the teachers involved here. The demo
  // has no server to send push notifications from, so the change simply shows
  // up in the timetable.
}

export async function deleteSubstitution(id: string) {
  const actor = await checkAdmin();

  const sub = await prisma.scheduleSubstitution.delete({ where: { id } });

  await logAction({
    userId: actor.id,
    action: "DELETE_SUBSTITUTION",
    entity: "schedule_substitution",
    entityId: id,
    meta: { groupId: sub.groupId, lessonNumber: sub.lessonNumber },
  });
}
