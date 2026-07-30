"use client";

import { useState, useTransition } from "react";
import { translate } from "@/lib/i18n/translate";
import {
  IconPlus,
  IconPencil,
  IconCalendarEvent,
  IconSparkles,
  IconEraser,
} from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconBtn } from "@/components/ui/icon-btn";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { BellSlotEditor, type SlotCell } from "@/components/admin/bell-slot-editor";
import {
  createBellOverride,
  updateBellOverride,
  deleteBellOverride,
} from "@/lib/actions/admin";
import { useRefresh } from "@/lib/use-refresh";
import { DEFAULT_BELL_TIMES, type BellSlot } from "@/lib/bell-times";

interface Override {
  id: string;
  name: string | null;
  startDate: string;
  endDate: string;
  slots: BellSlot[];
}

const NUMBERS = Array.from({ length: 13 }, (_, i) => i + 1);

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function emptyCells(): Record<number, SlotCell> {
  const map: Record<number, SlotCell> = {};
  for (const n of NUMBERS) map[n] = { startTime: "", endTime: "" };
  return map;
}

function mainDefaults(): Record<number, SlotCell> {
  const map = emptyCells();
  for (const r of DEFAULT_BELL_TIMES) {
    if (r.dayGroup === "main" && map[r.number])
      map[r.number] = { startTime: r.startTime, endTime: r.endTime };
  }
  return map;
}

function slotsToCells(slots: BellSlot[]): Record<number, SlotCell> {
  const map = emptyCells();
  for (const s of slots) {
    if (map[s.number]) map[s.number] = { startTime: s.startTime, endTime: s.endTime };
  }
  return map;
}

export function BellOverridesManager({ overrides }: { overrides: Override[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Override | null>(null);
  const refresh = useRefresh();

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(o: Override) {
    setEditing(o);
    setDialogOpen(true);
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{translate("bells.overrides")}</h2>
          <p className="text-sm text-muted-foreground">
            {translate("ui.differentBellTimesForAPeriodHolidaysAnd")}
          </p>
        </div>
        <Button onClick={openCreate} className="shrink-0 gap-2">
          <IconPlus size={16} />
          <span className="hidden sm:inline">{translate("common.add")}</span>
        </Button>
      </div>

      {overrides.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-12 text-center">
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <IconCalendarEvent size={20} />
          </div>
          <p className="text-sm font-medium">{translate("ui.noTemporaryChanges")}</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            {translate("ui.addAPeriodToOverrideTheBellTimes")}
          </p>
          <Button variant="outline" size="sm" onClick={openCreate} className="mt-1 gap-1.5">
            <IconPlus size={15} />
            {translate("ui.addAPeriod")}
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {overrides.map((o) => (
            <li
              key={o.id}
              className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 shadow-xs transition-colors hover:border-foreground/20 sm:px-4"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <IconCalendarEvent size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{o.name || translate("ui.untitled")}</p>
                <p className="font-mono text-xs tabular-nums text-muted-foreground">
                  {fmtDate(o.startDate)} – {fmtDate(o.endDate)}
                </p>
              </div>
              <span className="shrink-0 rounded-md bg-muted px-2 py-1 font-mono text-xs tabular-nums text-muted-foreground">
                {o.slots.length} пар
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <IconBtn tooltip={translate("common.edit")} onClick={() => openEdit(o)}>
                  <IconPencil size={15} />
                </IconBtn>
                <DeleteDialog
                  label={`Удалить «${o.name || translate("ui.untitled")}»`}
                  action={async () => {
                    await deleteBellOverride(o.id);
                    refresh();
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {dialogOpen && (
        <OverrideDialog
          key={editing?.id ?? "new"}
          editing={editing}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </section>
  );
}

function OverrideDialog({
  editing,
  onClose,
}: {
  editing: Override | null;
  onClose: () => void;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [startDate, setStartDate] = useState(editing?.startDate ?? "");
  const [endDate, setEndDate] = useState(editing?.endDate ?? "");
  const [cells, setCells] = useState<Record<number, SlotCell>>(() =>
    editing ? slotsToCells(editing.slots) : mainDefaults(),
  );
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const refresh = useRefresh();

  const filled = NUMBERS.filter((n) => cells[n].startTime || cells[n].endTime).length;

  function setCell(n: number, field: keyof SlotCell, value: string) {
    setCells((prev) => ({ ...prev, [n]: { ...prev[n], [field]: value } }));
    if (error) setError("");
  }

  function handleSave() {
    setError("");
    const slots: BellSlot[] = [];
    for (const n of NUMBERS) {
      const c = cells[n];
      if (c.startTime || c.endTime)
        slots.push({ number: n, startTime: c.startTime, endTime: c.endTime });
    }
    startTransition(async () => {
      try {
        const payload = { name, startDate, endDate, slots };
        if (editing) await updateBellOverride(editing.id, payload);
        else await createBellOverride(payload);
        refresh();
        onClose();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : translate("common.error"));
      }
    });
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-4 overflow-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? translate("ui.changeThePeriod") : translate("ui.newTemporaryTimetable")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-0.5">
          <div className="flex flex-col gap-1.5">
            <Label>{translate("common.name")}</Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError("");
              }}
              placeholder={translate("ui.shortenedTimetable")}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label required>С</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (error) setError("");
                }}
                className="font-mono tabular-nums"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label required>По</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  if (error) setError("");
                }}
                className="font-mono tabular-nums"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <Label className="text-muted-foreground">
              {translate("nav.bells")}
              <span className="ml-1.5 font-mono text-xs tabular-nums">{filled}/13</span>
            </Label>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCells(mainDefaults())}
                className="gap-1.5 text-muted-foreground"
              >
                <IconSparkles size={14} />
                {translate("ui.standard2")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCells(emptyCells())}
                className="gap-1.5 text-muted-foreground"
              >
                <IconEraser size={14} />
                {translate("grade.clear")}
              </Button>
            </div>
          </div>

          <BellSlotEditor numbers={NUMBERS} cells={cells} onChange={setCell} />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            {translate("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={pending}>
            {pending ? translate("common.saving") : translate("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
