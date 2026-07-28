/** Returns YYYY-MM-DD string using UTC date parts. */
export function toISODate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Parses YYYY-MM-DD into a UTC-midnight Date.
 * Using Date.UTC avoids timezone shifts when Prisma serialises to PostgreSQL DATE.
 */
export function fromISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Returns UTC-midnight Monday of the week that contains `date`.
 * Uses local calendar parts so the result matches the user's current day.
 */
export function getMonday(date: Date): Date {
  // Pin local calendar date to UTC midnight to avoid tz drift in arithmetic.
  const pinned = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const day = pinned.getUTCDay(); // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  pinned.setUTCDate(pinned.getUTCDate() + diff);
  return pinned;
}

/** Returns 6 UTC-midnight dates (Mon–Sat) for the week starting on monday. */
export function getWeekDates(monday: Date): Date[] {
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(d.getUTCDate() + i);
    return d;
  });
}

/** Format a date as DD.MM using UTC parts. */
export function fmtShort(date: Date): string {
  const d = String(date.getUTCDate()).padStart(2, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${d}.${m}`;
}

/** Day-of-week number (1=Mon … 6=Sat) from a Date using UTC parts. */
export function dayOfWeekNum(date: Date): number {
  const d = date.getUTCDay(); // 0=Sun
  return d === 0 ? 7 : d;
}
