import Link from "next/link";
import { translate } from "@/lib/i18n/translate";

export type ScheduleEntry = {
  id: string;
  groupId: string;
  dayOfWeek: number;
  lessonNumber: number;
  room: string;
  subject: { id: string; name: string };
  teacher: { id: string; name: string };
  group: { id: string; name: string };
};

export type ScheduleViewMode = "group" | "teacher" | "room";

// Built on each call: the labels are translated, and the catalog is not
// loaded yet when this module is first imported.
function DAYS() {
  return [
  { num: 1, label: translate("day.1.short") },
  { num: 2, label: translate("day.2.short") },
  { num: 3, label: translate("day.3.short") },
  { num: 4, label: translate("day.4.short") },
  { num: 5, label: translate("day.5.short") },
  { num: 6, label: translate("day.6.short") },
];
}

const LESSONS = Array.from({ length: 13 }, (_, i) => i + 1);

function buildMap(entries: ScheduleEntry[]) {
  const map = new Map<string, ScheduleEntry>();
  for (const e of entries) {
    map.set(`${e.dayOfWeek}-${e.lessonNumber}`, e);
  }
  return map;
}

interface ScheduleTableProps {
  entries: ScheduleEntry[];
  mode: ScheduleViewMode;
  baseUrl?: string;
}

export function ScheduleTable({
  entries,
  mode,
  baseUrl = "/schedule",
}: ScheduleTableProps) {
  const map = buildMap(entries);

  return (
    <div className="overflow-auto rounded-lg border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-muted/50">
            <th className="border-r px-3 py-2 text-center font-medium text-muted-foreground w-10">
              №
            </th>
            {DAYS().map((d) => (
              <th
                key={d.num}
                className="border-r last:border-r-0 px-3 py-2 text-center font-medium min-w-44"
              >
                {d.label}
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
              {DAYS().map((d) => {
                const entry = map.get(`${d.num}-${lessonNum}`);
                return (
                  <td
                    key={d.num}
                    className="border-r last:border-r-0 px-3 py-2 align-top"
                  >
                    {entry ? (
                      <div className="flex flex-col gap-0.5 max-w-[160px]">
                        <span className="font-medium text-foreground truncate" title={entry.subject.name}>
                          {entry.subject.name}
                        </span>
                        {mode === "teacher" ? (
                          <>
                            <Link
                              href={`${baseUrl}?group=${entry.groupId}`}
                              className="text-xs text-muted-foreground hover:text-primary hover:underline truncate"
                              title={entry.group.name}
                            >
                              {entry.group.name}
                            </Link>
                            <Link
                              href={`${baseUrl}?room=${encodeURIComponent(entry.room)}`}
                              className="text-xs text-muted-foreground hover:text-primary hover:underline truncate"
                              title={translate("ui.roomShort", { room: entry.room })}
                            >{translate("ui.roomShort", { room: entry.room })}</Link>
                          </>
                        ) : mode === "room" ? (
                          <>
                            <Link
                              href={`${baseUrl}?teacher=${entry.teacher.id}`}
                              className="text-xs text-muted-foreground hover:text-primary hover:underline truncate"
                              title={entry.teacher.name}
                            >
                              {entry.teacher.name}
                            </Link>
                            <Link
                              href={`${baseUrl}?group=${entry.groupId}`}
                              className="text-xs text-muted-foreground hover:text-primary hover:underline truncate"
                              title={entry.group.name}
                            >
                              {entry.group.name}
                            </Link>
                          </>
                        ) : (
                          <>
                            <Link
                              href={`${baseUrl}?teacher=${entry.teacher.id}`}
                              className="text-xs text-muted-foreground hover:text-primary hover:underline truncate"
                              title={entry.teacher.name}
                            >
                              {entry.teacher.name}
                            </Link>
                            <Link
                              href={`${baseUrl}?room=${encodeURIComponent(entry.room)}`}
                              className="text-xs text-muted-foreground hover:text-primary hover:underline truncate"
                              title={translate("ui.roomShort", { room: entry.room })}
                            >{translate("ui.roomShort", { room: entry.room })}</Link>
                          </>
                        )}
                      </div>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
