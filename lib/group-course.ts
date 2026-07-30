import { translate } from "@/lib/i18n/translate";
/**
 * Курс группы вычисляется автоматически из её названия.
 *
 * Формат названия: <буква специальности>-<цифры>, где первая цифра числовой
 * части — это последняя цифра года поступления (напр. «Т-395» → поступление в
 * год, оканчивающийся на 3). Курс = текущий учебный год − год поступления + 1.
 * Учебный год переключается 1 сентября.
 *
 * Пример: на 2025/26 учебный год «Т-395» (поступление 2023) → 3 курс.
 */

const MAX_COURSE = 4;

/** Год начала текущего учебного года (учебный год стартует в сентябре). */
function academicStartYear(now: Date): number {
  // Месяцы 0-based: сентябрь = 8.
  return now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
}

/**
 * Возвращает курс группы (1..4) или null, если название без цифр.
 */
export function courseFromGroupName(name: string, now: Date = new Date()): number | null {
  const match = name.match(/\d+/);
  if (!match) return null;

  const digits = match[0];
  const admissionDigit = Number(digits[0]);
  const startYear = academicStartYear(now);
  // Самый поздний год <= startYear, оканчивающийся на admissionDigit.
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

/** Отображение курса: «3 курс» или «—». */
export function formatCourse(name: string, now: Date = new Date()): string {
  const course = courseFromGroupName(name, now);
  return course === null ? "—" : translate("ui.courseValue", { course });
}
