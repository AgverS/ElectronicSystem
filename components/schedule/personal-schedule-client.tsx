"use client";

import { useState } from "react";
import { translate } from "@/lib/i18n/translate";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  WeekScheduleTable,
  type BaseEntry,
  type SubEntry,
  type WeekViewMode,
  type ExtraLessonEntry,
} from "@/components/schedule/week-schedule-table";
import { ScheduleSearch, type SearchResult } from "@/components/schedule/schedule-search";
import {
  getMonday,
  getWeekDates,
  toISODate,
  fmtShort,
} from "@/lib/week";
import { IconChevronLeft, IconChevronRight, IconArrowLeft } from "@tabler/icons-react";
import { CalendarSubscribe } from "@/components/schedule/calendar-subscribe";
import { buildBellTimesByDay, type BellContext } from "@/lib/bell-times";
import { ExtraLessonCreateDialog } from "@/components/schedule/extra-lesson-create-dialog";
import { ExtraLessonViewDialog } from "@/components/schedule/extra-lesson-view-dialog";

type ActiveFilter =
  | { kind: "group"; id: string; label: string }
  | { kind: "teacher"; id: string; label: string }
  | { kind: "room"; id: string; label: string };

type OwnFilter =
  | { kind: "group"; id: string; label: string }
  | { kind: "teacher"; id: string; label: string };

interface Props {
  own: OwnFilter;
  bellSchedule: BellContext;
  userId?: string; // current user's own id (for RSVP context)
  userRole?: "TEACHER" | "STUDENT";
}

export function PersonalScheduleClient({
  own,
  bellSchedule,
  userId,
  userRole,
}: Props) {
  const [filter, setFilter] = useState<ActiveFilter | null>(null);
  const [monday, setMonday] = useState(() => getMonday(new Date()));

  // Extra lesson dialog state
  const [createSlot, setCreateSlot] = useState<{ date: string; lessonNum: number } | null>(null);
  const [viewLesson, setViewLesson] = useState<ExtraLessonEntry | null>(null);

  const queryClient = useQueryClient();

  const weekDates = getWeekDates(monday);
  const weekStart = toISODate(monday);
  const saturday = weekDates[5];
  const todayMonday = getMonday(new Date());
  const isCurrentWeek = weekStart === toISODate(todayMonday);

  const active: ActiveFilter = filter ?? own;

  const baseApiUrl =
    active.kind === "group"
      ? `/api/schedule?groupId=${active.id}`
      : active.kind === "teacher"
        ? `/api/schedule?teacherId=${active.id}`
        : `/api/schedule?room=${encodeURIComponent(active.id)}`;

  const subsApiUrl =
    active.kind === "group"
      ? `/api/schedule/subs?groupId=${active.id}&week=${weekStart}`
      : active.kind === "teacher"
        ? `/api/schedule/subs?teacherId=${active.id}&week=${weekStart}`
        : `/api/schedule/subs?room=${encodeURIComponent(active.id)}&week=${weekStart}`;

  const extraApiUrl =
    active.kind === "teacher"
      ? `/api/extra-lessons?teacherId=${active.id}&week=${weekStart}${userId ? `&userId=${userId}` : ""}`
      : active.kind === "group"
        ? `/api/extra-lessons?groupId=${active.id}&week=${weekStart}${userId ? `&userId=${userId}` : ""}`
        : null;

  const { data: baseEntries = [] } = useQuery<BaseEntry[]>({
    queryKey: ["personal-schedule-base", active.kind, active.id],
    queryFn: async () => (await fetch(baseApiUrl)).json(),
  });

  const { data: substitutions = [] } = useQuery<SubEntry[]>({
    queryKey: ["personal-schedule-subs", active.kind, active.id, weekStart],
    queryFn: async () => (await fetch(subsApiUrl)).json(),
  });

  const { data: extraLessons = [] } = useQuery<ExtraLessonEntry[]>({
    queryKey: ["extra-lessons", active.kind, active.id, weekStart, userId],
    queryFn: async () => extraApiUrl ? (await fetch(extraApiUrl)).json() : [],
    enabled: !!extraApiUrl,
  });

  const mode: WeekViewMode =
    active.kind === "teacher" ? "teacher" : active.kind === "room" ? "room" : "group";

  const isOwnView = filter === null;
  const isTeacherOwnView = isOwnView && own.kind === "teacher" && userRole === "TEACHER";
  const isStudentOwnView = isOwnView && own.kind === "group" && userRole === "STUDENT";

  function invalidateExtra() {
    queryClient.invalidateQueries({
      queryKey: ["extra-lessons", active.kind, active.id, weekStart],
    });
  }

  function handleSelect(result: SearchResult) {
    if (result.kind === "group") {
      setFilter({ kind: "group", id: result.id!, label: result.label });
    } else if (result.kind === "teacher") {
      setFilter({ kind: "teacher", id: result.id!, label: result.label });
    } else {
      setFilter({ kind: "room", id: result.value!, label: result.label });
    }
  }

  function handleNavigate(kind: "group" | "teacher" | "room", value: string) {
    if (kind === "group") {
      const label =
        baseEntries.find((e) => e.groupId === value)?.group.name ??
        substitutions.find((e) => e.groupId === value)?.group.name ??
        value;
      setFilter({ kind: "group", id: value, label });
    } else if (kind === "teacher") {
      const label =
        baseEntries.find((e) => e.teacher.id === value)?.teacher.name ??
        substitutions.find((e) => e.teacher?.id === value)?.teacher?.name ??
        value;
      setFilter({ kind: "teacher", id: value, label });
    } else {
      setFilter({ kind: "room", id: value, label: `Кабинет ${value}` });
    }
  }

  function shiftWeek(delta: number) {
    setMonday((prev) => {
      const d = new Date(prev);
      d.setUTCDate(d.getUTCDate() + delta * 7);
      return d;
    });
  }

  const weekLabel = `${fmtShort(monday)} – ${fmtShort(saturday)}`;

  const title = isOwnView
    ? own.kind === "group"
      ? `Группа ${own.label}`
      : own.label
    : active.kind === "teacher"
      ? active.label
      : active.kind === "room"
        ? active.label
        : `Группа ${active.label}`;

  const subtitle = isOwnView
    ? translate("ui.myTimetable")
    : active.kind === "teacher"
      ? translate("ui.teacherTimetable")
      : active.kind === "room"
        ? translate("ui.roomTimetable")
        : translate("ui.groupTimetable");

  function handleRsvpChanged(id: string, attending: boolean) {
    queryClient.setQueryData<ExtraLessonEntry[]>(
      ["extra-lessons", active.kind, active.id, weekStart, userId],
      (prev) =>
        prev?.map((el) =>
          el.id === id
            ? { ...el, myRsvp: attending, rsvpCount: el.rsvpCount + (attending ? 1 : -1) }
            : el,
        ),
    );
    if (viewLesson?.id === id) {
      setViewLesson((prev) =>
        prev
          ? { ...prev, myRsvp: attending, rsvpCount: prev.rsvpCount + (attending ? 1 : -1) }
          : prev,
      );
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ScheduleSearch onSelect={handleSelect} />

      {!isOwnView && (
        <button
          onClick={() => setFilter(null)}
          className="flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <IconArrowLeft size={14} />
          {translate("ui.backToMyTimetable")}
        </button>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isOwnView && <CalendarSubscribe />}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => shiftWeek(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted"
        >
          <IconChevronLeft size={16} />
        </button>
        <span className="min-w-32 text-center text-sm font-medium">
          {weekLabel}
        </span>
        <button
          onClick={() => shiftWeek(1)}
          className="flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted"
        >
          <IconChevronRight size={16} />
        </button>
        {!isCurrentWeek && (
          <button
            onClick={() => setMonday(getMonday(new Date()))}
            className="rounded-md bg-muted/30 px-3 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted"
          >
            {translate("ui.goToTheCurrentWeek")}
          </button>
        )}
      </div>

      {baseEntries.length === 0 && substitutions.length === 0 && extraLessons.length === 0 ? (
        <p className="text-muted-foreground">{translate("ui.noTimetableFound")}</p>
      ) : (
        <WeekScheduleTable
          baseEntries={baseEntries}
          substitutions={substitutions}
          weekDates={weekDates}
          mode={mode}
          bellTimesByDay={buildBellTimesByDay(weekDates, bellSchedule)}
          onNavigate={handleNavigate}
          extraLessons={extraLessons}
          onAddExtraLesson={
            isTeacherOwnView
              ? (date, lessonNum) => setCreateSlot({ date, lessonNum })
              : undefined
          }
          onExtraLessonClick={
            isTeacherOwnView || isStudentOwnView
              ? (lesson) => setViewLesson(lesson)
              : undefined
          }
        />
      )}

      {createSlot && (
        <ExtraLessonCreateDialog
          open
          date={createSlot.date}
          lessonNumber={createSlot.lessonNum}
          onClose={() => setCreateSlot(null)}
          onCreated={invalidateExtra}
        />
      )}

      {viewLesson && isTeacherOwnView && (
        <ExtraLessonViewDialog
          role="teacher"
          lesson={viewLesson}
          onClose={() => setViewLesson(null)}
          onDeleted={invalidateExtra}
        />
      )}

      {viewLesson && isStudentOwnView && (
        <ExtraLessonViewDialog
          role="student"
          lesson={viewLesson}
          onClose={() => setViewLesson(null)}
          onRsvpChanged={handleRsvpChanged}
        />
      )}
    </div>
  );
}
