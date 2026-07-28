"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconPencil, IconClockHour4 } from "@tabler/icons-react";
import { setSubjectHours } from "@/lib/actions/teacher";
import { useRefresh } from "@/lib/use-refresh";

interface JournalHoursProps {
  assignmentId: string;
  conductedHours: number;
  plannedHours: number | null;
  canEdit: boolean;
}

export function JournalHours({
  assignmentId,
  conductedHours,
  plannedHours,
  canEdit,
}: JournalHoursProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(
    plannedHours != null ? String(plannedHours) : "",
  );
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const refresh = useRefresh();

  function handleOpenChange(next: boolean) {
    if (next) {
      setValue(plannedHours != null ? String(plannedHours) : "");
      setError("");
    }
    setOpen(next);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const hours = value.trim() === "" ? null : Number(value);
    if (hours != null && (!Number.isInteger(hours) || hours < 0)) {
      setError("Введите целое неотрицательное число");
      return;
    }
    startTransition(async () => {
      try {
        await setSubjectHours({ assignmentId, hours });
        refresh();
        setOpen(false);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Ошибка");
      }
    });
  }

  // Без часов и без права правки — ничего не показываем
  if (plannedHours == null && !canEdit) return null;

  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <IconClockHour4 size={15} className="shrink-0" />
      {plannedHours != null ? (
        <span>
          Часы:{" "}
          <strong className="text-foreground">
            {conductedHours} / {plannedHours}
          </strong>
        </span>
      ) : (
        <span>Часы не заданы</span>
      )}

      {canEdit && (
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <button
              type="button"
              aria-label="Изменить часы по предмету"
              className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <IconPencil size={14} />
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Часы по предмету</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 pt-2">
              <div className="flex flex-col gap-1">
                <Label>Количество часов</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="например, 72"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Часы задаются на предмет. Пусто или 0 — снять.
                </p>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button type="submit" disabled={pending}>
                {pending ? "Сохранение..." : "Сохранить"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </span>
  );
}
