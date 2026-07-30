"use client";

import { useState, useTransition } from "react";
import { translate } from "@/lib/i18n/translate";
import { IconPencil } from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { IconBtn } from "@/components/ui/icon-btn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSubject } from "@/lib/actions/admin";
import { useRefresh } from "@/lib/use-refresh";
import { SpecialtyMultiSelect } from "@/components/admin/specialty-multiselect";

import { Switch } from "../ui/switch";

interface EditSubjectDialogProps {
  subject: {
    id: string;
    name: string;
    isPractical: boolean;
    hours: number | null;
    specialties: { id: string; name: string; abbreviation: string }[];
  };
  specialties: { id: string; name: string; abbreviation: string }[];
}

export function EditSubjectDialog({ subject, specialties }: EditSubjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(subject.name);
  const [isPractical, setIsPractical] = useState(subject.isPractical);
  const [hours, setHours] = useState(
    subject.hours != null ? String(subject.hours) : "",
  );
  const [specialtyIds, setSpecialtyIds] = useState<Set<string>>(
    () => new Set(subject.specialties.map((s) => s.id)),
  );
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const refresh = useRefresh();

  function handleOpenChange(v: boolean) {
    if (v) {
      // Reset to the current values whenever the dialog opens.
      setName(subject.name);
      setIsPractical(subject.isPractical);
      setHours(subject.hours != null ? String(subject.hours) : "");
      setSpecialtyIds(new Set(subject.specialties.map((s) => s.id)));
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

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError(translate("ui.enterAName"));
      return;
    }
    startTransition(async () => {
      try {
        await updateSubject(subject.id, {
          name: name.trim(),
          isPractical,
          hours: hours.trim() === "" ? null : Number(hours),
          specialtyIds: [...specialtyIds],
        });
        refresh();
        setOpen(false);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : translate("common.error"));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <IconBtn tooltip={translate("common.edit")}>
          <IconPencil size={15} />
        </IconBtn>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{translate("ui.editTheSubject")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1">
            <Label required>{translate("common.name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1">
            <Label>{translate("ui.hoursPerSemester")}</Label>
            <Input
              type="number"
              min={0}
              step={1}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder={translate("ui.notSet")}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="edit-practical"
              checked={isPractical}
              onCheckedChange={setIsPractical}
            />
            <Label htmlFor="edit-practical">{translate("ui.practicalSubject")}</Label>
          </div>

          <SpecialtyMultiSelect
            specialties={specialties}
            selected={specialtyIds}
            onToggle={toggleSpecialty}
            onToggleAll={toggleAllSpecialties}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {translate("common.cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? translate("common.saving") : translate("common.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
