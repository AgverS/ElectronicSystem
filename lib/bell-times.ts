import { translate } from "@/lib/i18n/translate";
// Bell times.
//
// The standard timetable is defined for three groups of days:
//   "main" — Mon, Tue, Wed, Fri; "thu" — Thursday; "sat" — Saturday.
// Temporary overrides covering a date range take precedence over the standard.

export type DayGroup = "main" | "thu" | "sat";

// Built on each call: the labels are translated, and the catalog is not
// loaded yet when this module is first imported.
export function DAY_GROUPS(): { key: DayGroup; label: string }[] {
  return [
  { key: "main", label: translate("bells.dayGroup.main") },
  { key: "thu", label: translate("day.4") },
  { key: "sat", label: translate("day.6") },
];
}

export interface BellTimeRow {
  dayGroup: string;
  number: number;
  startTime: string;
  endTime: string;
}

export interface BellSlot {
  number: number;
  startTime: string;
  endTime: string;
}

export interface BellOverrideData {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  slots: BellSlot[];
}

// number -> { startTime, endTime }
export type BellTimesMap = Record<number, { startTime: string; endTime: string }>;

// Day of the week (1 = Mon … 6 = Sat, 0 = Sun). Dates are pinned to UTC.
export function weekdayOf(date: Date): number {
  return date.getUTCDay();
}

export function dayGroupForWeekday(weekday: number): DayGroup | null {
  if (weekday === 4) return "thu";
  if (weekday === 6) return "sat";
  if (weekday >= 1 && weekday <= 5) return "main"; // 1, 2, 3, 5 — Thursday is handled above
  return null; // Sunday
}

// Fallback bell times, used when nothing has been configured yet.
export const DEFAULT_BELL_TIMES: BellTimeRow[] = [
  // main — Mon, Tue, Wed, Fri
  { dayGroup: "main", number: 1, startTime: "08:00", endTime: "08:45" },
  { dayGroup: "main", number: 2, startTime: "08:55", endTime: "09:40" },
  { dayGroup: "main", number: 3, startTime: "09:50", endTime: "10:35" },
  { dayGroup: "main", number: 4, startTime: "10:45", endTime: "11:30" },
  { dayGroup: "main", number: 5, startTime: "12:00", endTime: "12:45" },
  { dayGroup: "main", number: 6, startTime: "12:55", endTime: "13:40" },
  { dayGroup: "main", number: 7, startTime: "14:00", endTime: "14:45" },
  { dayGroup: "main", number: 8, startTime: "14:55", endTime: "15:40" },
  { dayGroup: "main", number: 9, startTime: "16:00", endTime: "16:45" },
  { dayGroup: "main", number: 10, startTime: "16:55", endTime: "17:40" },
  { dayGroup: "main", number: 11, startTime: "17:50", endTime: "18:35" },
  { dayGroup: "main", number: 12, startTime: "18:45", endTime: "19:30" },
  { dayGroup: "main", number: 13, startTime: "19:40", endTime: "20:25" },
  // thu — Thursday
  { dayGroup: "thu", number: 1, startTime: "08:00", endTime: "08:45" },
  { dayGroup: "thu", number: 2, startTime: "08:55", endTime: "09:40" },
  { dayGroup: "thu", number: 3, startTime: "09:50", endTime: "10:35" },
  { dayGroup: "thu", number: 4, startTime: "10:45", endTime: "11:30" },
  { dayGroup: "thu", number: 5, startTime: "12:00", endTime: "12:45" },
  { dayGroup: "thu", number: 6, startTime: "12:55", endTime: "13:40" },
  { dayGroup: "thu", number: 7, startTime: "14:40", endTime: "15:25" },
  { dayGroup: "thu", number: 8, startTime: "15:35", endTime: "16:20" },
  { dayGroup: "thu", number: 9, startTime: "16:30", endTime: "17:15" },
  { dayGroup: "thu", number: 10, startTime: "17:25", endTime: "18:10" },
  { dayGroup: "thu", number: 11, startTime: "18:20", endTime: "19:05" },
  { dayGroup: "thu", number: 12, startTime: "19:15", endTime: "20:00" },
  { dayGroup: "thu", number: 13, startTime: "20:10", endTime: "20:55" },
  // sat — Saturday
  { dayGroup: "sat", number: 1, startTime: "08:00", endTime: "08:45" },
  { dayGroup: "sat", number: 2, startTime: "08:55", endTime: "09:40" },
  { dayGroup: "sat", number: 3, startTime: "09:50", endTime: "10:35" },
  { dayGroup: "sat", number: 4, startTime: "10:45", endTime: "11:30" },
  { dayGroup: "sat", number: 5, startTime: "11:40", endTime: "12:25" },
  { dayGroup: "sat", number: 6, startTime: "12:35", endTime: "13:20" },
  { dayGroup: "sat", number: 7, startTime: "13:40", endTime: "14:25" },
  { dayGroup: "sat", number: 8, startTime: "14:35", endTime: "15:20" },
  { dayGroup: "sat", number: 9, startTime: "15:30", endTime: "16:15" },
  { dayGroup: "sat", number: 10, startTime: "16:25", endTime: "17:10" },
  { dayGroup: "sat", number: 11, startTime: "17:20", endTime: "18:05" },
  { dayGroup: "sat", number: 12, startTime: "18:15", endTime: "19:00" },
  { dayGroup: "sat", number: 13, startTime: "19:10", endTime: "19:55" },
];

function mapForGroup(rows: BellTimeRow[], group: DayGroup): BellTimesMap {
  const map: BellTimesMap = {};
  for (const r of rows) {
    if (r.dayGroup === group)
      map[r.number] = { startTime: r.startTime, endTime: r.endTime };
  }
  // Fall back to the standard times when this day group has none of its own.
  if (Object.keys(map).length === 0) {
    for (const r of DEFAULT_BELL_TIMES) {
      if (r.dayGroup === group)
        map[r.number] = { startTime: r.startTime, endTime: r.endTime };
    }
  }
  return map;
}

function slotsToMap(slots: BellSlot[]): BellTimesMap {
  const map: BellTimesMap = {};
  for (const s of slots)
    map[s.number] = { startTime: s.startTime, endTime: s.endTime };
  return map;
}

export interface BellContext {
  permanent: BellTimeRow[];
  overrides: BellOverrideData[];
}

// Bell times for a given date: a temporary override first, then the standard
// times for that day of the week.
export function resolveBellTimes(date: Date, ctx: BellContext): BellTimesMap {
  const iso = date.toISOString().slice(0, 10);
  const ov = ctx.overrides.find((o) => o.startDate <= iso && iso <= o.endDate);
  if (ov) return slotsToMap(ov.slots);

  const group = dayGroupForWeekday(weekdayOf(date));
  if (!group) return {};
  return mapForGroup(ctx.permanent, group);
}

// Bell times for each day of the week, for the timetable grid's columns.
export function buildBellTimesByDay(
  weekDates: Date[],
  ctx: BellContext,
): BellTimesMap[] {
  return weekDates.map((d) => resolveBellTimes(d, ctx));
}
