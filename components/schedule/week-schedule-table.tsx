"use client";

import { useEffect, useRef, useState } from "react";
import { translate } from "@/lib/i18n/translate";
import Link from "next/link";
import { fmtShort, toISODate } from "@/lib/week";
import type { BellTimesMap } from "@/lib/bell-times";
import { cn, shortName } from "@/lib/utils";

export type BaseEntry = {
  id: string;
  groupId: string;
  dayOfWeek: number;
  lessonNumber: number;
  subgroup: string;
  room: string;
  subject: { id: string; name: string };
  teacher: { id: string; name: string };
  group: { id: string; name: string };
};

export type SubEntry = {
  id: string;
  groupId: string;
  date: string; // YYYY-MM-DD
  lessonNumber: number;
  subgroup: string;
  cancelled: boolean;
  room: string | null;
  subject: { id: string; name: string } | null;
  teacher: { id: string; name: string } | null;
  group: { id: string; name: string };
};

export type WeekViewMode = "group" | "teacher" | "room";

export type ExtraLessonEntry = {
  id: string;
  teacherId: string;
  teacher: { id: string; name: string };
  date: string; // YYYY-MM-DD
  lessonNumber: number;
  room: string;
  comment: string | null;
  groupId: string | null;
  group: { id: string; name: string } | null;
  rsvpCount: number;
  myRsvp: boolean;
};

// Built on each call: the labels are translated, and the catalog is not
// loaded yet when this module is first imported.
function DAY_NAMES() {
  return [translate("day.1.short"), translate("day.2.short"), translate("day.3.short"), translate("day.4.short"), translate("day.5.short"), translate("day.6.short")];
}
const LESSONS = Array.from({ length: 13 }, (_, i) => i + 1);
const ALL_DAYS = [0, 1, 2, 3, 4, 5] as const;

interface Props {
  baseEntries: BaseEntry[];
  substitutions: SubEntry[];
  weekDates: Date[]; // 6 dates Mon–Sat
  mode: WeekViewMode;
  baseUrl?: string;
  bellTimesByDay?: BellTimesMap[]; // bell times per day, aligned with weekDates
  onNavigate?: (kind: "group" | "teacher" | "room", value: string) => void;
  extraLessons?: ExtraLessonEntry[];
  onAddExtraLesson?: (date: string, lessonNum: number) => void;
  onExtraLessonClick?: (lesson: ExtraLessonEntry) => void;
}

function AllCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="h-3.5 w-3.5 cursor-pointer accent-primary"
      title={translate("ui.showCoverLessonsForEveryDay")}
    />
  );
}

export function WeekScheduleTable({
  baseEntries,
  substitutions,
  weekDates,
  mode,
  baseUrl = "/schedule",
  bellTimesByDay,
  onNavigate,
  extraLessons = [],
  onAddExtraLesson,
  onExtraLessonClick,
}: Props) {
  const [hiddenDays, setHiddenDays] = useState<Set<number>>(new Set());

  function toggleDay(i: number) {
    setHiddenDays((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function toggleAll() {
    setHiddenDays(hiddenDays.size === 0 ? new Set(ALL_DAYS) : new Set());
  }

  const allChecked = hiddenDays.size === 0;
  const allIndeterminate = hiddenDays.size > 0 && hiddenDays.size < 6;

  // Index base entries by dayOfWeek-lessonNumber → array (multiple subgroups)
  const baseMap = new Map<string, BaseEntry[]>();
  for (const e of baseEntries) {
    const key = `${e.dayOfWeek}-${e.lessonNumber}`;
    const arr = baseMap.get(key) ?? [];
    arr.push(e);
    baseMap.set(key, arr);
  }

  // Index substitutions by date-lessonNumber → array (multiple subgroups)
  const subMap = new Map<string, SubEntry[]>();
  for (const s of substitutions) {
    const key = `${s.date}-${s.lessonNumber}`;
    const arr = subMap.get(key) ?? [];
    arr.push(s);
    subMap.set(key, arr);
  }

  // Index extra lessons by date-lessonNumber
  const extraMap = new Map<string, ExtraLessonEntry>();
  for (const el of extraLessons) {
    extraMap.set(`${el.date}-${el.lessonNumber}`, el);
  }

  function renderExtraLessonBlock(el: ExtraLessonEntry) {
    return (
      <button
        onClick={() => onExtraLessonClick?.(el)}
        className="w-full text-left rounded-md border border-green-200 bg-green-50 px-2 py-1.5 dark:border-green-800 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
      >
        <span className="block text-[9px] font-bold uppercase tracking-wide text-green-700 dark:text-green-400 mb-0.5">
          {translate("audit.entity.extra_lesson")}
        </span>
        {mode !== "teacher" && (
          <span className="block text-xs font-medium text-foreground">{el.teacher.name}</span>
        )}
        <span className="block text-xs text-muted-foreground">{translate("ui.roomShort", { room: el.room })}</span>
        {el.comment && (
          <span className="block text-xs text-muted-foreground truncate">{el.comment}</span>
        )}
        {el.myRsvp && (
          <span className="block text-[10px] text-green-600 dark:text-green-400 mt-0.5">{translate("ui.youAreAttending")}</span>
        )}
        {mode === "teacher" && el.rsvpCount > 0 && (
          <span className="block text-[10px] text-muted-foreground mt-0.5">{translate("attendees.short", { count: el.rsvpCount })}</span>
        )}
      </button>
    );
  }

  function NavLink({
    kind,
    value,
    href,
    title,
    children,
  }: {
    kind: "group" | "teacher" | "room";
    value: string;
    href: string;
    title?: string;
    children: React.ReactNode;
  }) {
    if (onNavigate) {
      return (
        <button
          onClick={() => onNavigate(kind, value)}
          title={title}
          className="text-xs text-muted-foreground hover:text-primary hover:underline text-left"
        >
          {children}
        </button>
      );
    }
    return (
      <Link
        href={href}
        title={title}
        className="text-xs text-muted-foreground hover:text-primary hover:underline"
      >
        {children}
      </Link>
    );
  }

  function subgroupTag(sg: string) {
    return sg ? (
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{translate("ui.subgroupShort", { subgroup: sg })}</span>
    ) : null;
  }

  function renderBaseBlock(base: BaseEntry) {
    return (
      <div className="flex flex-col gap-0.5">
        {subgroupTag(base.subgroup)}
        <span className="font-medium text-foreground">{base.subject.name}</span>
        {mode === "teacher" ? (
          <>
            <NavLink
              kind="group"
              value={base.groupId}
              href={`${baseUrl}?group=${base.groupId}`}
            >
              {base.group.name}
            </NavLink>
            <NavLink
              kind="room"
              value={base.room}
              href={`${baseUrl}?room=${encodeURIComponent(base.room)}`}
            >{translate("ui.roomShort", { room: base.room })}</NavLink>
          </>
        ) : mode === "room" ? (
          <>
            <NavLink
              kind="teacher"
              value={base.teacher.id}
              href={`${baseUrl}?teacher=${base.teacher.id}`}
              title={base.teacher.name}
            >
              {shortName(base.teacher.name)}
            </NavLink>
            <NavLink
              kind="group"
              value={base.groupId}
              href={`${baseUrl}?group=${base.groupId}`}
            >
              {base.group.name}
            </NavLink>
          </>
        ) : (
          <>
            <NavLink
              kind="teacher"
              value={base.teacher.id}
              href={`${baseUrl}?teacher=${base.teacher.id}`}
              title={base.teacher.name}
            >
              {shortName(base.teacher.name)}
            </NavLink>
            <NavLink
              kind="room"
              value={base.room}
              href={`${baseUrl}?room=${encodeURIComponent(base.room)}`}
            >{translate("ui.roomShort", { room: base.room })}</NavLink>
          </>
        )}
      </div>
    );
  }

  function renderSubBlock(sub: SubEntry, base: BaseEntry | undefined) {
    if (sub.cancelled) {
      return (
        <div className="relative rounded-md border border-red-200 bg-red-50 px-2 py-1.5 dark:border-red-900 dark:bg-red-950/30 pt-4">
          <span className="absolute right-0 top-0 rounded-bl rounded-tr-md bg-red-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
            {translate("ui.cancelled")}
          </span>
          <div className="mb-1 flex justify-start">
            {subgroupTag(sub.subgroup)}
          </div>
          {base && (
            <div className="text-xs text-muted-foreground line-through">
              {base.subject.name}
            </div>
          )}
        </div>
      );
    }
    return (
      <div className="relative rounded-md border border-yellow-200 bg-yellow-50 px-2 py-1.5 dark:border-yellow-800 dark:bg-yellow-950/30 pt-4">
        <span className="absolute right-0 top-0 rounded-bl rounded-tr-md bg-yellow-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
          {translate("audit.entity.schedule_substitution")}
        </span>
        <div className="mb-1 flex justify-start">
          {subgroupTag(sub.subgroup)}
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-foreground">
            {sub.subject?.name ?? "-"}
          </span>
          {mode === "teacher" ? (
            <>
              <NavLink
                kind="group"
                value={sub.groupId}
                href={`${baseUrl}?group=${sub.groupId}`}
              >
                {sub.group.name}
              </NavLink>
              {sub.room && (
                <NavLink
                  kind="room"
                  value={sub.room}
                  href={`${baseUrl}?room=${encodeURIComponent(sub.room)}`}
                >{translate("ui.roomShort", { room: sub.room })}</NavLink>
              )}
            </>
          ) : mode === "room" ? (
            <>
              {sub.teacher && (
                <NavLink
                  kind="teacher"
                  value={sub.teacher.id}
                  href={`${baseUrl}?teacher=${sub.teacher.id}`}
                  title={sub.teacher.name}
                >
                  {shortName(sub.teacher.name)}
                </NavLink>
              )}
              <NavLink
                kind="group"
                value={sub.groupId}
                href={`${baseUrl}?group=${sub.groupId}`}
              >
                {sub.group.name}
              </NavLink>
            </>
          ) : (
            <>
              {sub.teacher && (
                <NavLink
                  kind="teacher"
                  value={sub.teacher.id}
                  href={`${baseUrl}?teacher=${sub.teacher.id}`}
                  title={sub.teacher.name}
                >
                  {shortName(sub.teacher.name)}
                </NavLink>
              )}
              {sub.room && (
                <NavLink
                  kind="room"
                  value={sub.room}
                  href={`${baseUrl}?room=${encodeURIComponent(sub.room)}`}
                >{translate("ui.roomShort", { room: sub.room })}</NavLink>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  function renderCell(
    baseList: BaseEntry[],
    subList: SubEntry[],
    colIndex: number,
    lessonNum: number,
    extraLesson: ExtraLessonEntry | undefined,
  ) {
    // Effective lesson per subgroup: substitution overrides the base entry
    const subgroups = Array.from(
      new Set([
        ...baseList.map((b) => b.subgroup),
        ...subList.map((s) => s.subgroup),
      ]),
    ).sort();

    const bell = bellTimesByDay?.[colIndex]?.[lessonNum];

    return (
      <td
        key={colIndex}
        className={cn(
          "relative border-r last:border-r-0 px-3 py-2 align-top",
          colIndex === todayCol && "bg-primary/5",
        )}
      >
        {extraLesson && onExtraLessonClick && (
          <button
            onClick={() => onExtraLessonClick(extraLesson)}
            title={translate("audit.entity.extra_lesson")}
            className="absolute top-1.5 right-1.5 flex items-center gap-0.5 rounded-full bg-green-100 dark:bg-green-950/60 px-1.5 py-0.5 text-[9px] font-semibold text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/60 transition-colors"
          >
            {translate("ui.extra")}
          </button>
        )}
        {bell && (
          <div className="mb-1 text-[10px] font-medium tabular-nums text-muted-foreground/80">
            {bell.startTime}–{bell.endTime}
          </div>
        )}
        {subgroups.map((sg, idx) => {
          const base = baseList.find((b) => b.subgroup === sg);
          const sub = subList.find((s) => s.subgroup === sg);
          return (
            <div key={sg || "_"}>
              {idx > 0 && (
                <div className="my-1.5 border-t border-dashed border-border/60" />
              )}
              {sub
                ? renderSubBlock(sub, base)
                : base
                  ? renderBaseBlock(base)
                  : null}
            </div>
          );
        })}
      </td>
    );
  }

  const todayISO = toISODate(new Date());
  const todayCol = weekDates.findIndex((d) => toISODate(d) === todayISO);

  return (
    <div className="overflow-auto rounded-lg border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky top-0 z-10 border-b border-r bg-muted px-3 py-2 text-center font-medium text-muted-foreground w-10">
              <div>№</div>
              <div className="mt-1 flex justify-center">
                <AllCheckbox
                  checked={allChecked}
                  indeterminate={allIndeterminate}
                  onChange={toggleAll}
                />
              </div>
            </th>
            {weekDates.map((date, i) => (
              <th
                key={i}
                className={cn(
                  "sticky top-0 z-10 border-b border-r last:border-r-0 px-3 py-2 text-center font-medium min-w-44",
                  i === todayCol ? "bg-primary/15 text-primary" : "bg-muted",
                )}
              >
                <div>{DAY_NAMES()[i]}</div>

                <div className="text-xs font-normal text-muted-foreground">
                  {fmtShort(date)}
                </div>
                <div className="mt-1 flex items-center justify-center gap-1">
                  <input
                    type="checkbox"
                    checked={!hiddenDays.has(i)}
                    onChange={() => toggleDay(i)}
                    className="h-3.5 w-3.5 cursor-pointer accent-primary"
                    title={translate("ui.showCoverLessons")}
                  />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {LESSONS.map((lessonNum) => (
            <tr key={lessonNum} className="border-t">
              <td className="border-r px-3 py-2 text-center text-muted-foreground font-medium">
                {lessonNum}
              </td>
              {weekDates.map((date, i) => {
                const dateStr = toISODate(date);
                const dow = i + 1;
                const baseList = baseMap.get(`${dow}-${lessonNum}`) ?? [];
                const subList = hiddenDays.has(i)
                  ? []
                  : (subMap.get(`${dateStr}-${lessonNum}`) ?? []);
                const extraLesson = extraMap.get(`${dateStr}-${lessonNum}`);

                if (baseList.length === 0 && subList.length === 0) {
                  if (extraLesson) {
                    return (
                      <td
                        key={i}
                        className={cn(
                          "border-r last:border-r-0 px-3 py-2 align-top",
                          i === todayCol && "bg-primary/5",
                        )}
                      >
                        {renderExtraLessonBlock(extraLesson)}
                      </td>
                    );
                  }
                  if (onAddExtraLesson) {
                    return (
                      <td
                        key={i}
                        className={cn(
                          "border-r last:border-r-0 px-3 py-2 align-middle",
                          i === todayCol && "bg-primary/5",
                        )}
                      >
                        <button
                          onClick={() => onAddExtraLesson(dateStr, lessonNum)}
                          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/40 hover:bg-muted hover:text-muted-foreground transition-colors mx-auto"
                          title={translate("ui.addAConsultation")}
                        >
                          <span className="text-base leading-none">+</span>
                        </button>
                      </td>
                    );
                  }
                  return (
                    <td
                      key={i}
                      className={cn(
                        "border-r last:border-r-0 px-3 py-2",
                        i === todayCol && "bg-primary/5",
                      )}
                    />
                  );
                }

                return renderCell(baseList, subList, i, lessonNum, extraLesson);
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
