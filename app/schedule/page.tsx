"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  WeekScheduleTable,
  type BaseEntry,
  type SubEntry,
  type WeekViewMode,
} from "@/components/schedule/week-schedule-table";
import { ScheduleSearch } from "@/components/schedule/schedule-search";
import { PublicGroupSelector } from "@/components/schedule/public-group-selector";
import { buildBellTimesByDay } from "@/lib/bell-times";
import { getMonday, getWeekDates, toISODate, fromISODate, fmtShort } from "@/lib/week";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { PublicCalendarSubscribe } from "@/components/schedule/calendar-subscribe";
import { PageLoading } from "@/components/ui/page-state";
import { useDemoData } from "@/lib/use-demo-data";
import { useT } from "@/lib/i18n/provider";
import { BrandMark } from "@/components/brand-mark";
import { LanguageSwitcher } from "@/components/demo/language-switcher";
import { ThemeToggle } from "@/components/demo/theme-toggle";

/** The public timetable: readable without choosing a role. */
export default function PublicSchedulePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <PublicScheduleContent />
    </Suspense>
  );
}

function PublicScheduleContent() {
  const searchParams = useSearchParams();
  const t = useT();

  const groupId = searchParams.get("group") ?? undefined;
  const teacherId = searchParams.get("teacher") ?? undefined;
  const room = searchParams.get("room") ?? undefined;
  const week = searchParams.get("week") ?? undefined;

  const today = new Date();
  const monday = week ? getMonday(fromISODate(week)) : getMonday(today);
  const weekDates = getWeekDates(monday);
  const weekStart = toISODate(monday);
  const saturday = weekDates[5];

  const prevMonday = new Date(monday);
  prevMonday.setUTCDate(prevMonday.getUTCDate() - 7);
  const nextMonday = new Date(monday);
  nextMonday.setUTCDate(nextMonday.getUTCDate() + 7);
  const isCurrentWeek = weekStart === toISODate(getMonday(today));

  const hasFilter = !!(groupId || teacherId || room);

  const { data, loading } = useDemoData(
    ["public-schedule", groupId, teacherId, room, weekStart],
    async () => {
      const relations = {
        subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true } },
        group: { select: { id: true, name: true } },
      };

      // Exactly one of group / teacher / room narrows the view.
      const filter = groupId
        ? { groupId }
        : teacherId
          ? { teacherId }
          : room
            ? { room }
            : null;

      let baseEntries: BaseEntry[] = [];
      let substitutions: SubEntry[] = [];

      if (filter) {
        const [rawBase, rawSubs] = await Promise.all([
          prisma.scheduleEntry.findMany({
            where: filter,
            include: relations,
            orderBy: [{ dayOfWeek: "asc" }, { lessonNumber: "asc" }],
          }),
          prisma.scheduleSubstitution.findMany({
            where: { ...filter, date: { gte: monday, lte: saturday } },
            include: relations,
            orderBy: [{ date: "asc" }, { lessonNumber: "asc" }],
          }),
        ]);
        baseEntries = rawBase as unknown as BaseEntry[];
        substitutions = rawSubs.map((s) => ({
          ...s,
          date: toISODate(s.date),
        })) as unknown as SubEntry[];
      }

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

      return { baseEntries, substitutions, bellTimesByDay };
    },
  );

  const baseUrlForFilter = groupId
    ? `/schedule/?group=${groupId}`
    : teacherId
      ? `/schedule/?teacher=${teacherId}`
      : room
        ? `/schedule/?room=${encodeURIComponent(room)}`
        : "/schedule/";

  const weekUrl = (mon: Date) => `${baseUrlForFilter}&week=${toISODate(mon)}`;

  const title = groupId
    ? data?.baseEntries[0]?.group?.name
      ? `${t("term.group")} ${data.baseEntries[0].group.name}`
      : t("nav.schedule")
    : teacherId
      ? (data?.baseEntries[0]?.teacher?.name ??
        data?.substitutions[0]?.teacher?.name ??
        t("term.teacher"))
      : room
        ? `${t("common.room")} ${room}`
        : t("nav.schedule");

  const subtitle = teacherId
    ? t("schedule.teacherTimetable")
    : room
      ? t("schedule.roomTimetable")
      : "";

  return (
    <div className="min-h-svh bg-background">
      <div className="border-b px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandMark className="size-6 shrink-0" />
            <span className="text-lg font-semibold">{t("nav.schedule")}</span>
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-6">
        <div className="mb-6">
          <ScheduleSearch />
        </div>

        {hasFilter && (
          <>
            <div className="mb-4">
              {subtitle && <p className="mb-0.5 text-sm text-muted-foreground">{subtitle}</p>}
              <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <Link
                  href={weekUrl(prevMonday)}
                  aria-label={t("common.previous")}
                  className="flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted"
                >
                  <IconChevronLeft size={16} />
                </Link>
                <span className="min-w-28 text-center text-sm font-medium">
                  {fmtShort(monday)} – {fmtShort(saturday)}
                </span>
                <Link
                  href={weekUrl(nextMonday)}
                  aria-label={t("common.next")}
                  className="flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted"
                >
                  <IconChevronRight size={16} />
                </Link>
              </div>
              {!isCurrentWeek && (
                <Link
                  href={baseUrlForFilter}
                  className="rounded-md bg-muted/30 px-3 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted"
                >
                  {t("schedule.currentWeek")}
                </Link>
              )}
              <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                {groupId && <PublicCalendarSubscribe filter={{ kind: "group", id: groupId }} />}
                {teacherId && (
                  <PublicCalendarSubscribe filter={{ kind: "teacher", id: teacherId }} />
                )}
                {room && <PublicCalendarSubscribe filter={{ kind: "room", id: room }} />}
              </div>
            </div>
          </>
        )}

        {!hasFilter ? (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-medium">{t("schedule.pickGroup")}</h2>
              <p className="text-sm text-muted-foreground">{t("schedule.pickGroupHint")}</p>
            </div>
            <PublicGroupSelector />
          </div>
        ) : loading || !data ? (
          <PageLoading />
        ) : data.baseEntries.length === 0 && data.substitutions.length === 0 ? (
          <p className="text-muted-foreground">{t("schedule.notFound")}</p>
        ) : (
          <WeekScheduleTable
            baseEntries={data.baseEntries}
            substitutions={data.substitutions}
            weekDates={weekDates}
            mode={(groupId ? "group" : teacherId ? "teacher" : "room") as WeekViewMode}
            baseUrl="/schedule"
            bellTimesByDay={data.bellTimesByDay}
          />
        )}
      </div>
    </div>
  );
}
