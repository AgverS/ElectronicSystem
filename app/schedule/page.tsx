import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  WeekScheduleTable,
  type BaseEntry,
  type SubEntry,
  type WeekViewMode,
} from "@/components/schedule/week-schedule-table";
import { ScheduleSearch } from "@/components/schedule/schedule-search";
import { PublicGroupSelector } from "@/components/schedule/public-group-selector";
import { buildBellTimesByDay } from "@/lib/bell-times";
import {
  getMonday,
  getWeekDates,
  toISODate,
  fromISODate,
  fmtShort,
} from "@/lib/week";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { PushSubscribeButton } from "@/components/schedule/push-subscribe-button";
import { PublicCalendarSubscribe } from "@/components/schedule/calendar-subscribe";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Расписание" };

interface PageProps {
  searchParams: Promise<{
    group?: string;
    teacher?: string;
    room?: string;
    week?: string;
  }>;
}

export default async function PublicSchedulePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { group: groupId, teacher: teacherId, room } = params;

  const today = new Date();
  const monday = params.week
    ? getMonday(fromISODate(params.week))
    : getMonday(today);
  const weekDates = getWeekDates(monday);
  const weekStart = toISODate(monday);
  const saturday = weekDates[5];

  const prevMonday = new Date(monday);
  prevMonday.setUTCDate(prevMonday.getUTCDate() - 7);
  const nextMonday = new Date(monday);
  nextMonday.setUTCDate(nextMonday.getUTCDate() + 7);
  const todayMonday = getMonday(today);
  const isCurrentWeek = weekStart === toISODate(todayMonday);

  let baseEntries: BaseEntry[] = [];
  let substitutions: SubEntry[] = [];
  let title = "Расписание";
  let subtitle = "";
  let mode: WeekViewMode = "group";

  const subInclude = {
    subject: { select: { id: true, name: true } },
    teacher: { select: { id: true, name: true } },
    group: { select: { id: true, name: true } },
  };

  if (groupId) {
    const [rawBase, rawSubs] = await Promise.all([
      prisma.scheduleEntry.findMany({
        where: { groupId },
        include: subInclude,
        orderBy: [{ dayOfWeek: "asc" }, { lessonNumber: "asc" }],
      }),
      prisma.scheduleSubstitution.findMany({
        where: { groupId, date: { gte: monday, lte: saturday } },
        include: subInclude,
        orderBy: [{ date: "asc" }, { lessonNumber: "asc" }],
      }),
    ]);
    baseEntries = rawBase as BaseEntry[];
    substitutions = rawSubs.map((s) => ({ ...s, date: toISODate(s.date) }));
    title = baseEntries[0]?.group?.name
      ? `Группа ${baseEntries[0].group.name}`
      : "Расписание";
    mode = "group";
  } else if (teacherId) {
    const [rawBase, rawSubs] = await Promise.all([
      prisma.scheduleEntry.findMany({
        where: { teacherId },
        include: subInclude,
        orderBy: [{ dayOfWeek: "asc" }, { lessonNumber: "asc" }],
      }),
      prisma.scheduleSubstitution.findMany({
        where: { teacherId, date: { gte: monday, lte: saturday } },
        include: subInclude,
        orderBy: [{ date: "asc" }, { lessonNumber: "asc" }],
      }),
    ]);
    baseEntries = rawBase as BaseEntry[];
    substitutions = rawSubs.map((s) => ({ ...s, date: toISODate(s.date) }));
    title =
      baseEntries[0]?.teacher?.name ??
      substitutions[0]?.teacher?.name ??
      "Преподаватель";
    subtitle = "Расписание преподавателя";
    mode = "teacher";
  } else if (room) {
    const [rawBase, rawSubs] = await Promise.all([
      prisma.scheduleEntry.findMany({
        where: { room },
        include: subInclude,
        orderBy: [{ dayOfWeek: "asc" }, { lessonNumber: "asc" }],
      }),
      prisma.scheduleSubstitution.findMany({
        where: { room, date: { gte: monday, lte: saturday } },
        include: subInclude,
        orderBy: [{ date: "asc" }, { lessonNumber: "asc" }],
      }),
    ]);
    baseEntries = rawBase as BaseEntry[];
    substitutions = rawSubs.map((s) => ({ ...s, date: toISODate(s.date) }));
    title = `Кабинет ${room}`;
    subtitle = "Расписание кабинета";
    mode = "room";
  }

  // Build week nav URLs preserving current filter
  function weekUrl(mon: Date) {
    const w = toISODate(mon);
    const base = groupId
      ? `/schedule?group=${groupId}`
      : teacherId
        ? `/schedule?teacher=${teacherId}`
        : room
          ? `/schedule?room=${encodeURIComponent(room)}`
          : "/schedule";
    return `${base}&week=${w}`;
  }

  const weekLabel = `${fmtShort(monday)} – ${fmtShort(saturday)}`;
  const hasFilter = !!(groupId || teacherId || room);

  const [permanentBells, weekOverrides] = await Promise.all([
    prisma.bellTime.findMany(),
    prisma.bellOverride.findMany({
      where: { startDate: { lte: saturday }, endDate: { gte: monday } },
      include: { slots: true },
    }),
  ]);
  const bellTimesByDay = buildBellTimesByDay(weekDates, {
    permanent: permanentBells,
    overrides: weekOverrides.map((o) => ({
      startDate: toISODate(o.startDate),
      endDate: toISODate(o.endDate),
      slots: o.slots,
    })),
  });

  return (
    <div className="min-h-svh bg-background">
      <div className="border-b px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <Link href="/schedule" className="font-semibold text-lg">
            Расписание
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-6">
        <div className="mb-6">
          <ScheduleSearch />
        </div>

        {hasFilter && (
          <div className="mb-4">
            {subtitle && (
              <p className="text-sm text-muted-foreground mb-0.5">{subtitle}</p>
            )}
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          </div>
        )}

        {hasFilter && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Link
                href={weekUrl(prevMonday)}
                className="flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted"
              >
                <IconChevronLeft size={16} />
              </Link>
              <span className="min-w-28 text-center text-sm font-medium">
                {weekLabel}
              </span>
              <Link
                href={weekUrl(nextMonday)}
                className="flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted"
              >
                <IconChevronRight size={16} />
              </Link>
            </div>
            {!isCurrentWeek && (
              <Link
                href={
                  groupId
                    ? `/schedule?group=${groupId}`
                    : teacherId
                      ? `/schedule?teacher=${teacherId}`
                      : `/schedule?room=${encodeURIComponent(room ?? "")}`
                }
                className="rounded-md bg-muted/30 px-3 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted"
              >
                Текущая неделя
              </Link>
            )}
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              {groupId && (
                <PublicCalendarSubscribe filter={{ kind: "group", id: groupId }} />
              )}
              {teacherId && (
                <PublicCalendarSubscribe filter={{ kind: "teacher", id: teacherId }} />
              )}
              {room && (
                <PublicCalendarSubscribe filter={{ kind: "room", id: room }} />
              )}
              {groupId && <PushSubscribeButton filter={{ groupId }} vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />}
              {teacherId && <PushSubscribeButton filter={{ teacherId }} vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />}
              {room && <PushSubscribeButton filter={{ room }} vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />}
            </div>
          </div>
        )}

        {!hasFilter ? (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-medium">Выберите группу из списка</h2>
              <p className="text-sm text-muted-foreground">
                Или воспользуйтесь поиском выше, чтобы найти преподавателя или кабинет.
              </p>
            </div>
            <PublicGroupSelector />
          </div>
        ) : baseEntries.length === 0 && substitutions.length === 0 ? (
          <p className="text-muted-foreground">Расписание не найдено.</p>
        ) : (
          <WeekScheduleTable
            baseEntries={baseEntries}
            substitutions={substitutions}
            weekDates={weekDates}
            mode={mode}
            baseUrl="/schedule"
            bellTimesByDay={bellTimesByDay}
          />
        )}
      </div>
    </div>
  );
}
