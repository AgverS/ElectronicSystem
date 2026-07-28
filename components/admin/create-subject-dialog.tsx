"use client";

import { useState, useTransition } from "react";
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
import { IconPlus } from "@tabler/icons-react";
import { createSubject } from "@/lib/actions/admin";
import { useRefresh } from "@/lib/use-refresh";
import { SpecialtyMultiSelect } from "@/components/admin/specialty-multiselect";
import { Switch } from "../ui/switch";

interface Props {
  specialties: { id: string; name: string; abbreviation: string }[];
}

export function CreateSubjectDialog({ specialties }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [isPractical, setIsPractical] = useState(false);
  const [hours, setHours] = useState("");
  const [specialtyIds, setSpecialtyIds] = useState<Set<string>>(
    specialties.length === 1 ? new Set([specialties[0].id]) : new Set(),
  );
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const refresh = useRefresh();

  function handleOpenChange(v: boolean) {
    if (!v) {
      setName("");
      setIsPractical(false);
      setHours("");
      setSpecialtyIds(new Set());
      setError("");
    }
    setOpen(v);
  }

  function toggleSpecialty(id: string) {
    setSpecialtyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllSpecialties(ids: string[]) {
    setSpecialtyIds(new Set(ids));
  }

  function handleSubmit() {
    setError("");
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Введите название");
      return;
    }
    startTransition(async () => {
      try {
        await createSubject({
          name: trimmed,
          isPractical,
          hours: hours.trim() === "" ? null : Number(hours),
          specialtyIds: [...specialtyIds],
        });
        refresh();
        handleOpenChange(false);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Ошибка");
      }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <IconPlus size={16} />
        Создать предмет
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новый предмет</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Label required>Название</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Математика"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label>Часы (за семестр)</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="не задано"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="practical"
                checked={isPractical}
                onCheckedChange={setIsPractical}
              />
              <Label htmlFor="practical">Практический предмет</Label>
            </div>

            {specialties.length !== 1 && (
              <SpecialtyMultiSelect
                specialties={specialties}
                selected={specialtyIds}
                onToggle={toggleSpecialty}
                onToggleAll={toggleAllSpecialties}
              />
            )}
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={pending}
            >
              Отмена
            </Button>
            <Button onClick={handleSubmit} disabled={pending}>
              {pending ? "Создание..." : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
