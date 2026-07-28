"use client";

import { useState } from "react";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import {
  resolveBellTimes,
  type BellContext,
  dayGroupForWeekday,
  weekdayOf,
  DAY_GROUPS,
} from "@/lib/bell-times";
import { Button } from "@/components/ui/button";

const DAY_NAMES = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const MONTH_NAMES = [
  "янв", "фев", "мар", "апр", "май", "июн",
  "июл", "авг", "сен", "окт", "ноя", "дек",
];

function utcToday(): Date {
  const n = new Date();
  const d = new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
  if (d.getUTCDay() === 0) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

function fmtDate(d: Date) {
  return `${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${DAY_NAMES[d.getUTCDay()]}`;
}

export function BellsView({ ctx }: { ctx: BellContext }) {
  const [date, setDate] = useState(utcToday);

  const iso = date.toISOString().slice(0, 10);
  const bells = resolveBellTimes(date, ctx);
  const slots = Object.entries(bells)
    .map(([n, t]) => ({ number: parseInt(n), ...t }))
    .sort((a, b) => a.number - b.number);

  const dayGroup = dayGroupForWeekday(weekdayOf(date));
  const dayGroupLabel = dayGroup
    ? DAY_GROUPS.find((g) => g.key === dayGroup)?.label
    : null;
  const isOverride = ctx.overrides.some((o) => o.startDate <= iso && iso <= o.endDate);
  const isToday = iso === utcToday().toISOString().slice(0, 10);

  function shiftDay(delta: number) {
    setDate((prev) => {
      const d = new Date(prev);
      d.setUTCDate(d.getUTCDate() + delta);
      if (d.getUTCDay() === 0) d.setUTCDate(d.getUTCDate() + delta);
      return d;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => shiftDay(-1)}>
          <IconChevronLeft size={16} />
        </Button>
        <div className="flex-1 text-center">
          <div className="text-sm font-medium">{fmtDate(date)}</div>
          <div className="text-xs text-muted-foreground">
            {isOverride ? (
              <span className="font-medium text-yellow-600 dark:text-yellow-400">
                Изменённое расписание
              </span>
            ) : dayGroupLabel ? (
              dayGroupLabel
            ) : (
              "Воскресенье — выходной"
            )}
          </div>
        </div>
        <Button variant="outline" size="icon" onClick={() => shiftDay(1)}>
          <IconChevronRight size={16} />
        </Button>
      </div>

      {!isToday && (
        <Button
          variant="ghost"
          size="sm"
          className="-mt-2 self-start text-muted-foreground"
          onClick={() => setDate(utcToday())}
        >
          К сегодняшнему
        </Button>
      )}

      {slots.length === 0 ? (
        <p className="text-sm text-muted-foreground">Нет занятий в этот день.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted text-muted-foreground">
                <th className="w-10 px-4 py-2 text-left font-medium">№</th>
                <th className="px-4 py-2 text-left font-medium">Начало</th>
                <th className="px-4 py-2 text-left font-medium">Конец</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((s, i) => (
                <tr key={s.number} className={i % 2 !== 0 ? "bg-muted/30" : ""}>
                  <td className="px-4 py-2 font-medium text-muted-foreground">{s.number}</td>
                  <td className="px-4 py-2 font-mono">{s.startTime}</td>
                  <td className="px-4 py-2 font-mono">{s.endTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
