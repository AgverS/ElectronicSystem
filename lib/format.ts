"use client";

import { useCallback, useMemo } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { getStudentCourse } from "@/lib/utils";

/**
 * Locale-aware formatting. Dates in this app are pinned to UTC midnight (see
 * lib/week.ts), so every formatter reads UTC parts — otherwise a lesson could
 * appear a day early for anyone west of Greenwich.
 */
export function useFormatters() {
  const { intlLocale, t } = useI18n();

  const shortDate = useMemo(
    () =>
      new Intl.DateTimeFormat(intlLocale, {
        day: "2-digit",
        month: "2-digit",
        timeZone: "UTC",
      }),
    [intlLocale],
  );

  const longDate = useMemo(
    () =>
      new Intl.DateTimeFormat(intlLocale, {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }),
    [intlLocale],
  );

  const monthYear = useMemo(
    () => new Intl.DateTimeFormat(intlLocale, { month: "long", year: "numeric", timeZone: "UTC" }),
    [intlLocale],
  );

  const dateTime = useMemo(
    () =>
      new Intl.DateTimeFormat(intlLocale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [intlLocale],
  );

  /** "Year 3, semester 5 (2025-2026)" — or the plain name without a group. */
  const semesterName = useCallback(
    (
      semester: { name: string; number?: number; year: string } | null | undefined,
      groupName?: string,
    ) => {
      if (!semester) return "";
      if (!groupName) return semester.name;
      const course = getStudentCourse(groupName, semester.year);
      if (!course) return semester.name;
      const number = semester.number ?? Number(semester.name.match(/\d+/)?.[0] ?? 0);
      return t("semester.fullName", { course, number, year: semester.year });
    },
    [t],
  );

  return {
    formatShortDate: (date: Date) => shortDate.format(date),
    formatLongDate: (date: Date) => longDate.format(date),
    formatMonthYear: (date: Date) => monthYear.format(date),
    formatDateTime: (date: Date) => dateTime.format(date),
    semesterName,
  };
}
