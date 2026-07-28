// Генерация iCalendar (.ics) для подписки в Google Календарь / Apple / Outlook.
// Время — в часовом поясе Europe/Minsk (UTC+3, без перехода на летнее время).

export const CAL_TZID = "Europe/Minsk";

export interface IcsEvent {
  uid: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  summary: string;
  location?: string;
  description?: string;
}

function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// Складывание длинных строк по правилу RFC 5545 (≤75 октетов в строке).
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 0) {
    parts.push(" " + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  return parts.join("\r\n");
}

// "2026-06-16" + "08:00" -> "20260616T080000"
function dtLocal(date: string, time: string): string {
  const d = date.replace(/-/g, "");
  const [h, m] = time.split(":");
  return `${d}T${h}${m}00`;
}

function utcStamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

// Статическое определение Europe/Minsk: фиксированный сдвиг +03:00.
const VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  `TZID:${CAL_TZID}`,
  "BEGIN:STANDARD",
  "DTSTART:19700101T000000",
  "TZOFFSETFROM:+0300",
  "TZOFFSETTO:+0300",
  "TZNAME:+03",
  "END:STANDARD",
  "END:VTIMEZONE",
];

export function buildIcs(opts: {
  calendarName: string;
  events: IcsEvent[];
  domain: string;
  now?: Date;
}): string {
  const now = opts.now ?? new Date();
  const stamp = utcStamp(now);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//kbpej//schedule//RU",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(opts.calendarName)}`,
    `X-WR-TIMEZONE:${CAL_TZID}`,
    ...VTIMEZONE,
  ];

  for (const e of opts.events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}@${opts.domain}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=${CAL_TZID}:${dtLocal(e.date, e.startTime)}`,
      `DTEND;TZID=${CAL_TZID}:${dtLocal(e.date, e.endTime)}`,
      `SUMMARY:${escapeText(e.summary)}`,
    );
    if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`);
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return lines.map(foldLine).join("\r\n") + "\r\n";
}
