// Разворачивает недельное расписание + замены в конкретные занятия по датам,
// подставляя время из расписания звонков. Используется для генерации .ics.

import { resolveBellTimes, type BellContext } from "@/lib/bell-times";
import { toISODate } from "@/lib/week";
import type { IcsEvent } from "@/lib/calendar/ics";

export interface BaseEntryInput {
  id: string;
  groupId: string;
  dayOfWeek: number; // 1..6
  lessonNumber: number;
  subgroup: string;
  room: string;
  subject: { name: string };
  teacher: { id: string; name: string };
  group: { name: string };
}

export interface SubInput {
  id: string;
  groupId: string;
  date: string; // YYYY-MM-DD
  lessonNumber: number;
  subgroup: string;
  cancelled: boolean;
  room: string | null;
  subject: { name: string } | null;
  teacher: { id: string; name: string } | null;
  group: { name: string };
}

function eachDate(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  const d = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
  );
  const last = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  while (d.getTime() <= last) {
    out.push(new Date(d));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

function subKey(groupId: string, iso: string, lesson: number, subgroup: string) {
  return `${groupId}|${iso}|${lesson}|${subgroup}`;
}

function subgroupSuffix(sg: string) {
  return sg ? ` (подгр. ${sg})` : "";
}

// Расписание группы (для ученика).
export function computeGroupEvents(opts: {
  base: BaseEntryInput[];
  subs: SubInput[];
  range: { start: Date; end: Date };
  bell: BellContext;
}): IcsEvent[] {
  const { base, subs, range, bell } = opts;
  const subMap = new Map<string, SubInput>();
  for (const s of subs)
    subMap.set(subKey(s.groupId, s.date, s.lessonNumber, s.subgroup), s);

  const events: IcsEvent[] = [];

  for (const day of eachDate(range.start, range.end)) {
    const iso = toISODate(day);
    const weekday = day.getUTCDay(); // 1..6, 0=Вс
    if (weekday === 0) continue;
    const bellMap = resolveBellTimes(day, bell);

    // Все слоты этого дня: из базы (по дню недели) и из замен (по дате).
    const slots = new Set<string>();
    const baseToday = base.filter((b) => b.dayOfWeek === weekday);
    for (const b of baseToday) slots.add(`${b.lessonNumber}|${b.subgroup}`);
    for (const s of subs)
      if (s.date === iso) slots.add(`${s.lessonNumber}|${s.subgroup}`);

    for (const slot of slots) {
      const [lessonStr, subgroup] = slot.split("|");
      const lessonNumber = Number(lessonStr);
      const sub = subMap.get(
        subKey(baseToday[0]?.groupId ?? base[0]?.groupId ?? "", iso, lessonNumber, subgroup),
      );
      const b = baseToday.find(
        (x) => x.lessonNumber === lessonNumber && x.subgroup === subgroup,
      );

      if (sub && sub.cancelled) continue;
      const time = bellMap[lessonNumber];
      if (!time) continue;

      let summary: string;
      let teacherName: string | undefined;
      let room: string | null | undefined;
      let uid: string;

      if (sub) {
        summary = sub.subject?.name ?? "Замена";
        teacherName = sub.teacher?.name;
        room = sub.room;
        uid = `sub-${sub.id}`;
      } else if (b) {
        summary = b.subject.name;
        teacherName = b.teacher.name;
        room = b.room;
        uid = `base-${b.id}-${iso}`;
      } else {
        continue;
      }

      events.push({
        uid,
        date: iso,
        startTime: time.startTime,
        endTime: time.endTime,
        summary: `${lessonNumber}. ${summary}${subgroupSuffix(subgroup)}`,
        location: room ? `Каб. ${room}` : undefined,
        description: teacherName ? `Преподаватель: ${teacherName}` : undefined,
      });
    }
  }

  return events;
}

// Расписание преподавателя (его пары, с учётом замен и отмен).
export function computeTeacherEvents(opts: {
  teacherId: string;
  base: BaseEntryInput[]; // пары, где преподаёт этот преподаватель
  subs: SubInput[]; // замены по его группам ИЛИ где он назначен
  range: { start: Date; end: Date };
  bell: BellContext;
}): IcsEvent[] {
  const { teacherId, base, subs, range, bell } = opts;
  const subMap = new Map<string, SubInput>();
  for (const s of subs)
    subMap.set(subKey(s.groupId, s.date, s.lessonNumber, s.subgroup), s);

  const events: IcsEvent[] = [];
  const emitted = new Set<string>();

  for (const day of eachDate(range.start, range.end)) {
    const iso = toISODate(day);
    const weekday = day.getUTCDay();
    if (weekday === 0) continue;
    const bellMap = resolveBellTimes(day, bell);

    // 1. Базовые пары преподавателя в этот день недели.
    for (const b of base) {
      if (b.dayOfWeek !== weekday) continue;
      const key = subKey(b.groupId, iso, b.lessonNumber, b.subgroup);
      const sub = subMap.get(key);
      // Эффективный преподаватель на эту дату.
      const effectiveTeacher = sub
        ? sub.cancelled
          ? null
          : (sub.teacher?.id ?? null)
        : teacherId;
      if (effectiveTeacher !== teacherId) continue;
      const time = bellMap[b.lessonNumber];
      if (!time) continue;

      const subject = sub ? (sub.subject?.name ?? b.subject.name) : b.subject.name;
      const room = sub ? sub.room : b.room;
      emitted.add(key);
      events.push({
        uid: sub ? `sub-${sub.id}` : `base-${b.id}-${iso}`,
        date: iso,
        startTime: time.startTime,
        endTime: time.endTime,
        summary: `${b.lessonNumber}. ${subject} — ${b.group.name}${subgroupSuffix(b.subgroup)}`,
        location: room ? `Каб. ${room}` : undefined,
      });
    }

    // 2. Замены, где преподаватель назначен на чужую/новую пару.
    for (const s of subs) {
      if (s.date !== iso || s.cancelled) continue;
      if (s.teacher?.id !== teacherId) continue;
      const key = subKey(s.groupId, iso, s.lessonNumber, s.subgroup);
      if (emitted.has(key)) continue;
      const time = bellMap[s.lessonNumber];
      if (!time) continue;
      emitted.add(key);
      events.push({
        uid: `sub-${s.id}`,
        date: iso,
        startTime: time.startTime,
        endTime: time.endTime,
        summary: `${s.lessonNumber}. ${s.subject?.name ?? "Замена"} — ${s.group.name}${subgroupSuffix(s.subgroup)}`,
        location: s.room ? `Каб. ${s.room}` : undefined,
      });
    }
  }

  return events;
}

// Расписание кабинета (все пары, проходящие в этом кабинете, с учётом замен).
export function computeRoomEvents(opts: {
  room: string;
  base: BaseEntryInput[]; // базовые пары в этом кабинете
  subs: SubInput[]; // замены в этом кабинете ИЛИ по группам этих пар
  range: { start: Date; end: Date };
  bell: BellContext;
}): IcsEvent[] {
  const { room, base, subs, range, bell } = opts;
  const subMap = new Map<string, SubInput>();
  for (const s of subs)
    subMap.set(subKey(s.groupId, s.date, s.lessonNumber, s.subgroup), s);

  const events: IcsEvent[] = [];
  const emitted = new Set<string>();

  for (const day of eachDate(range.start, range.end)) {
    const iso = toISODate(day);
    const weekday = day.getUTCDay();
    if (weekday === 0) continue;
    const bellMap = resolveBellTimes(day, bell);

    // 1. Базовые пары в этом кабинете в этот день недели.
    for (const b of base) {
      if (b.dayOfWeek !== weekday) continue;
      const key = subKey(b.groupId, iso, b.lessonNumber, b.subgroup);
      const sub = subMap.get(key);
      // Эффективный кабинет на эту дату (замена могла перенести/отменить пару).
      const effectiveRoom = sub ? (sub.cancelled ? null : sub.room) : b.room;
      if (effectiveRoom !== room) continue;
      const time = bellMap[b.lessonNumber];
      if (!time) continue;
      const subject = sub ? (sub.subject?.name ?? b.subject.name) : b.subject.name;
      const teacherName = sub ? sub.teacher?.name : b.teacher.name;
      emitted.add(key);
      events.push({
        uid: sub ? `sub-${sub.id}` : `base-${b.id}-${iso}`,
        date: iso,
        startTime: time.startTime,
        endTime: time.endTime,
        summary: `${b.lessonNumber}. ${subject} — ${b.group.name}${subgroupSuffix(b.subgroup)}`,
        description: teacherName ? `Преподаватель: ${teacherName}` : undefined,
      });
    }

    // 2. Замены, перенесённые в этот кабинет (база была в другом кабинете).
    for (const s of subs) {
      if (s.date !== iso || s.cancelled) continue;
      if (s.room !== room) continue;
      const key = subKey(s.groupId, iso, s.lessonNumber, s.subgroup);
      if (emitted.has(key)) continue;
      const time = bellMap[s.lessonNumber];
      if (!time) continue;
      emitted.add(key);
      events.push({
        uid: `sub-${s.id}`,
        date: iso,
        startTime: time.startTime,
        endTime: time.endTime,
        summary: `${s.lessonNumber}. ${s.subject?.name ?? "Замена"} — ${s.group.name}${subgroupSuffix(s.subgroup)}`,
        description: s.teacher?.name ? `Преподаватель: ${s.teacher.name}` : undefined,
      });
    }
  }

  return events;
}
