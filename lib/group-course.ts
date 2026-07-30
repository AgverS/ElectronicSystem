import { translate } from "@/lib/i18n/translate";
/**
 * A group's year is worked out from its name.
 *
 * Names read <specialty letter>-<digits>, where the first digit of the number
 * is the last digit of the year of entry (so "S-395" means a year of entry
 * ending in 3). The year of study is the current academic year minus the year
 * of entry, plus one. The academic year rolls over on 1 September.
 *
 * Example: in 2025/26, "S-395" (entry 2023) is in year 3.
 */

const MAX_COURSE = 4;

/** The year the current academic year began — it starts in September. */
function academicStartYear(now: Date): number {
  // Months are zero-based, so September is 8.
  return now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
}

/**
 * The group's year (1..4), or null when the name has no digits.
 */
export function courseFromGroupName(name: string, now: Date = new Date()): number | null {
  const match = name.match(/\d+/);
  if (!match) return null;

  const digits = match[0];
  const admissionDigit = Number(digits[0]);
  const startYear = academicStartYear(now);
  // The latest year at or before startYear ending in admissionDigit.
  const admissionYear =
    startYear - (((startYear % 10) - admissionDigit + 10) % 10);

  let course = startYear - admissionYear + 1;

  if (digits.length >= 2 && digits[1] === "1") {
    course += 1;
  }

  if (course < 1) return 1;
  if (course > MAX_COURSE) return MAX_COURSE;
  return course;
}

/** The year as a label, e.g. "Year 3", or an em dash. */
export function formatCourse(name: string, now: Date = new Date()): string {
  const course = courseFromGroupName(name, now);
  return course === null ? "—" : translate("ui.courseValue", { course });
}
