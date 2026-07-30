import { RecordKind } from "@/lib/prisma-client";
import { translate } from "@/lib/i18n/translate";

export const RECORD_KIND_LABELS: Record<RecordKind, string> = {
  REWARD: translate("record.kind.REWARD"),
  PENALTY: translate("record.kind.PENALTY"),
};

// Colours pulled from the same palette as the grade cells (green = positive,
// red = negative) so records read consistently with the journal.
export const RECORD_KIND_COLORS: Record<RecordKind, string> = {
  REWARD: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  PENALTY: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export function formatRecordDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Дисциплинарное взыскание действует ровно один год с даты выдачи. Дата, после
// которой оно считается истёкшим.
export function penaltyExpiresAt(date: Date | string): Date {
  const expiry = new Date(date);
  expiry.setFullYear(expiry.getFullYear() + 1);
  return expiry;
}

// Истекло ли взыскание. Поощрения не истекают. Через год с даты выдачи взыскание
// у учащегося пропадает, а администратору показывается как истёкшее.
export function isPenaltyExpired(
  record: { kind: RecordKind; date: Date | string },
  now: Date = new Date(),
): boolean {
  if (record.kind !== RecordKind.PENALTY) return false;
  return now >= penaltyExpiresAt(record.date);
}

// Списано ли взыскание досрочно администратором. Списанное взыскание остаётся
// видно администратору, но больше не считается действующим.
export function isPenaltyWrittenOff(record: {
  kind: RecordKind;
  writtenOffAt?: Date | string | null;
}): boolean {
  return record.kind === RecordKind.PENALTY && record.writtenOffAt != null;
}
