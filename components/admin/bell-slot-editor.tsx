"use client";

import { Input } from "@/components/ui/input";
import { translate } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";

export type SlotCell = { startTime: string; endTime: string };

// Длительность пары в минутах, либо null если время не задано полностью.
export function slotDuration(start: string, end: string): number | null {
  if (!start || !end) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some((v) => Number.isNaN(v))) return null;
  return eh * 60 + em - (sh * 60 + sm);
}

export function BellSlotEditor({
  numbers,
  cells,
  onChange,
}: {
  numbers: number[];
  cells: Record<number, SlotCell>;
  onChange: (n: number, field: keyof SlotCell, value: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="grid grid-cols-[2rem_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b bg-muted/50 px-2.5 py-2 font-mono text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase sm:grid-cols-[2.25rem_minmax(0,1fr)_auto_minmax(0,1fr)_3.5rem] sm:gap-3 sm:px-3">
        <span className="text-center">№</span>
        <span>{translate("bells.start")}</span>
        <span className="text-center" aria-hidden>
          –
        </span>
        <span>{translate("bells.end")}</span>
        <span className="hidden text-right sm:block">{translate("ui.length")}</span>
      </div>

      {numbers.map((n, i) => {
        const c = cells[n] ?? { startTime: "", endTime: "" };
        const dur = slotDuration(c.startTime, c.endTime);
        const invalid = dur !== null && dur <= 0;
        const filled = Boolean(c.startTime || c.endTime);
        return (
          <div
            key={n}
            className={cn(
              "grid grid-cols-[2rem_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-2.5 py-1.5 transition-colors sm:grid-cols-[2.25rem_minmax(0,1fr)_auto_minmax(0,1fr)_3.5rem] sm:gap-3 sm:px-3",
              i > 0 && "border-t",
              filled ? "bg-card" : "bg-muted/20",
            )}
          >
            <span
              className={cn(
                "flex size-7 items-center justify-center justify-self-center rounded-md font-mono text-xs font-semibold tabular-nums sm:size-8",
                filled
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {n}
            </span>
            <Input
              type="time"
              aria-label={`Начало пары ${n}`}
              aria-invalid={invalid}
              value={c.startTime}
              onChange={(e) => onChange(n, "startTime", e.target.value)}
              className="h-9 font-mono tabular-nums"
            />
            <span className="text-muted-foreground" aria-hidden>
              –
            </span>
            <Input
              type="time"
              aria-label={`Конец пары ${n}`}
              aria-invalid={invalid}
              value={c.endTime}
              onChange={(e) => onChange(n, "endTime", e.target.value)}
              className="h-9 font-mono tabular-nums"
            />
            <span
              className={cn(
                "hidden text-right font-mono text-xs tabular-nums sm:block",
                invalid ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {dur === null ? "" : invalid ? "—" : `${dur}′`}
            </span>
          </div>
        );
      })}
    </div>
  );
}
