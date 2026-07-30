// Единый расчёт срока и статуса лабораторной работы — используется и в журнале
// преподавателя/админа, и в кабинете студента, чтобы статусы считались одинаково.

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

// Эффективный срок сдачи: явно заданный дедлайн или дата урока + 14 дней.
export function labDeadline(date: Date, deadline: Date | null): Date {
  return deadline ?? new Date(new Date(date).getTime() + TWO_WEEKS_MS);
}

export type LabStatus =
  | "passed" // passed, a mark of 3 or better
  | "failing" // a mark below 3, or an absence — not passed yet
  | "paid" // unmarked and past the deadline
  | "pending"; // unmarked, still within the deadline

export function labStatus(
  grade: string,
  date: Date,
  deadline: Date | null,
  now: Date = new Date(),
): LabStatus {
  const n = parseInt(grade);
  if (!isNaN(n) && n >= 3) return "passed";
  if (grade) return "failing";
  return now > labDeadline(date, deadline) ? "paid" : "pending";
}

// Сводка по списку лаб одного студента: сдано / не зачтено / выдано.
export function labStats(
  labs: { grade: string; date: Date; deadline: Date | null }[],
  now: Date = new Date(),
) {
  const issued = labs.length;
  const passed = labs.filter(
    (l) => labStatus(l.grade, l.date, l.deadline, now) === "passed",
  ).length;
  return { passed, notPassed: issued - passed, issued };
}
