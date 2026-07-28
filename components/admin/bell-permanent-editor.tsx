"use client";

import { useMemo, useState, useTransition } from "react";
import { IconDeviceFloppy, IconRotateClockwise, IconCheck } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BellSlotEditor, type SlotCell } from "@/components/admin/bell-slot-editor";
import { saveBellTimes } from "@/lib/actions/admin";
import { useRefresh } from "@/lib/use-refresh";
import {
  DAY_GROUPS,
  DEFAULT_BELL_TIMES,
  type BellTimeRow,
  type DayGroup,
} from "@/lib/bell-times";

const NUMBERS = Array.from({ length: 13 }, (_, i) => i + 1);

type State = Record<number, Record<DayGroup, SlotCell>>;

function buildState(initial: BellTimeRow[]): State {
  const source = initial.length > 0 ? initial : DEFAULT_BELL_TIMES;
  const state: State = {};
  for (const n of NUMBERS) {
    state[n] = {
      main: { startTime: "", endTime: "" },
      thu: { startTime: "", endTime: "" },
      sat: { startTime: "", endTime: "" },
    };
  }
  for (const r of source) {
    if (state[r.number] && (r.dayGroup === "main" || r.dayGroup === "thu" || r.dayGroup === "sat")) {
      state[r.number][r.dayGroup] = { startTime: r.startTime, endTime: r.endTime };
    }
  }
  return state;
}

function groupCells(state: State, group: DayGroup): Record<number, SlotCell> {
  const map: Record<number, SlotCell> = {};
  for (const n of NUMBERS) map[n] = state[n][group];
  return map;
}

function filledCount(state: State, group: DayGroup): number {
  return NUMBERS.filter((n) => state[n][group].startTime || state[n][group].endTime).length;
}

export function BellPermanentEditor({ initial }: { initial: BellTimeRow[] }) {
  const initialState = useMemo(() => buildState(initial), [initial]);
  const initialKey = useMemo(() => JSON.stringify(initialState), [initialState]);
  const [state, setState] = useState<State>(initialState);
  const [active, setActive] = useState<DayGroup>("main");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const refresh = useRefresh();

  const dirty = useMemo(() => JSON.stringify(state) !== initialKey, [state, initialKey]);

  function setCell(number: number, group: DayGroup, field: keyof SlotCell, value: string) {
    setState((prev) => ({
      ...prev,
      [number]: { ...prev[number], [group]: { ...prev[number][group], [field]: value } },
    }));
    setSaved(false);
  }

  function resetGroupToDefault(group: DayGroup) {
    setState((prev) => {
      const next = { ...prev };
      for (const n of NUMBERS) next[n] = { ...next[n], [group]: { startTime: "", endTime: "" } };
      for (const r of DEFAULT_BELL_TIMES) {
        if (r.dayGroup === group && next[r.number]) {
          next[r.number] = {
            ...next[r.number],
            [group]: { startTime: r.startTime, endTime: r.endTime },
          };
        }
      }
      return next;
    });
    setSaved(false);
  }

  function handleSave() {
    setError("");
    setSaved(false);
    const rows: BellTimeRow[] = [];
    for (const n of NUMBERS) {
      for (const g of DAY_GROUPS) {
        const cell = state[n][g.key];
        if (cell.startTime || cell.endTime) {
          rows.push({ dayGroup: g.key, number: n, startTime: cell.startTime, endTime: cell.endTime });
        }
      }
    }
    startTransition(async () => {
      try {
        await saveBellTimes(rows);
        setSaved(true);
        refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Ошибка");
      }
    });
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold">Постоянное расписание</h2>
        <p className="text-sm text-muted-foreground">
          Время каждой пары по дням недели. Выберите группу дней и задайте звонки.
        </p>
      </div>

      <Tabs value={active} onValueChange={(v) => setActive(v as DayGroup)}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList className="h-auto flex-wrap justify-start gap-1 p-1">
            {DAY_GROUPS.map((g) => (
              <TabsTrigger key={g.key} value={g.key} className="gap-1.5 px-3 py-1.5">
                {g.label}
                <span className="font-mono text-[0.6875rem] tabular-nums text-muted-foreground">
                  {filledCount(state, g.key)}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => resetGroupToDefault(active)}
            className="gap-1.5 text-muted-foreground"
          >
            <IconRotateClockwise size={14} />
            Стандартные
          </Button>
        </div>

        {DAY_GROUPS.map((g) => (
          <TabsContent key={g.key} value={g.key} className="mt-3">
            <BellSlotEditor
              numbers={NUMBERS}
              cells={groupCells(state, g.key)}
              onChange={(n, field, value) => setCell(n, g.key, field, value)}
            />
          </TabsContent>
        ))}
      </Tabs>

      <div className="sticky bottom-0 z-10 -mx-1 flex items-center justify-between gap-3 rounded-xl border bg-card/95 px-3 py-2.5 shadow-xs backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <p className="min-w-0 truncate text-sm">
          {error ? (
            <span className="text-destructive">{error}</span>
          ) : saved && !dirty ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500">
              <IconCheck size={15} />
              Сохранено
            </span>
          ) : dirty ? (
            <span className="text-muted-foreground">Есть несохранённые изменения</span>
          ) : (
            <span className="text-muted-foreground">Все изменения сохранены</span>
          )}
        </p>
        <Button onClick={handleSave} disabled={pending || !dirty} className="shrink-0 gap-2">
          <IconDeviceFloppy size={16} />
          {pending ? "Сохранение…" : "Сохранить"}
        </Button>
      </div>
    </section>
  );
}
