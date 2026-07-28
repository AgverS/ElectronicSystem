/**
 * Grading vocabulary, shared by every screen that shows a mark.
 *
 * Grades are on a ten-point scale. `AB` records an absence rather than a mark.
 * Which marks read as a failure depends on the kind of lesson: an absence from
 * a practical, and an absence or a mark below 3 in laboratory work or an
 * assessment, are all shortfalls the student has to make up.
 */

export const ABSENT = "AB";

/** Selectable values, in the order they appear in the grade picker. */
export const GRADE_VALUES = [
  "10", "9", "8", "7", "6", "5", "4", "3", "2", "1", ABSENT,
] as const;

const GRADE_TONES: Record<string, string> = {
  "1": "red",
  "2": "red",
  "3": "yellow",
  "4": "yellow",
  "5": "yellow",
  "6": "yellow",
  "7": "green",
  "8": "green",
  "9": "blue",
  "10": "blue",
  [ABSENT]: "orange",
};

const TONE_CLASSES: Record<string, string> = {
  red: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300",
  yellow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/60 dark:text-yellow-300",
  green: "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
  orange: "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300",
};

const TONE_HOVER: Record<string, string> = {
  red: "hover:bg-red-200 dark:hover:bg-red-950",
  yellow: "hover:bg-yellow-200 dark:hover:bg-yellow-950",
  green: "hover:bg-green-200 dark:hover:bg-green-950",
  blue: "hover:bg-blue-200 dark:hover:bg-blue-950",
  orange: "hover:bg-orange-200 dark:hover:bg-orange-950",
};

/** A shortfall the student must make up — shown emphatically, not just tinted. */
const FAILING_CLASSES =
  "bg-red-500 text-white dark:bg-red-600 dark:text-white ring-2 ring-red-300 dark:ring-red-900";
const FAILING_HOVER_CLASSES = `${FAILING_CLASSES} hover:bg-red-600 dark:hover:bg-red-500`;

export function isFailingGrade(value: string, lessonType: string): boolean {
  const absent = value === ABSENT;
  const numeric = parseInt(value, 10);

  if (lessonType === "practical") return absent;
  if (lessonType === "lab" || lessonType === "assessment") {
    return absent || (!isNaN(numeric) && numeric < 3);
  }
  return false;
}

/** Badge classes for displaying a grade. */
export function gradeClasses(value: string, lessonType = "lecture"): string {
  if (!value) return "";
  if (isFailingGrade(value, lessonType)) return FAILING_CLASSES;
  return TONE_CLASSES[GRADE_TONES[value]] ?? "bg-muted";
}

/** Badge classes for a grade rendered as a button, including hover state. */
export function gradeButtonClasses(value: string, lessonType = "lecture"): string {
  if (!value) return "";
  if (isFailingGrade(value, lessonType)) return FAILING_HOVER_CLASSES;
  const tone = GRADE_TONES[value];
  return tone ? `${TONE_CLASSES[tone]} ${TONE_HOVER[tone]}` : "";
}

/** Mean of the numeric marks, ignoring absences and blanks. */
export function averageGrade(values: readonly string[]): number | null {
  const numbers = values
    .filter((v) => v && v !== ABSENT)
    .map((v) => Number(v))
    .filter((n) => !isNaN(n));
  if (!numbers.length) return null;
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

/** Formatted mean, or an em dash when there is nothing to average. */
export function formatAverage(values: readonly string[]): string {
  const average = averageGrade(values);
  return average === null ? "—" : average.toFixed(1);
}

export function countAbsences(values: readonly string[]): number {
  return values.filter((v) => v === ABSENT).length;
}
