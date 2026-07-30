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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateGroup } from "@/lib/actions/admin";
import { useRefresh } from "@/lib/use-refresh";
import { formatCourse } from "@/lib/group-course";

// Radix Select forbids an empty SelectItem value, so a sentinel stands in for it.
const NONE = "__none__";

// Picks the specialty from the first letter of the group's name (Specialty.letter).
function specialtyIdByLetter(
  name: string,
  specialties: { id: string; letter: string }[],
): string {
  const letter = name.trim().charAt(0).toUpperCase();
  if (!letter) return "";
  const match = specialties.find(
    (s) => s.letter && s.letter.toUpperCase() === letter,
  );
  return match?.id ?? "";
}

interface EditGroupDialogProps {
  group: { id: string; name: string; curatorId: string | null; specialtyId: string | null };
  teachers: { id: string; name: string }[];
  specialties: { id: string; name: string; abbreviation: string; letter: string }[];
}

export function EditGroupDialog({ group, teachers, specialties }: EditGroupDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(group.name);
  const [curatorId, setCuratorId] = useState(group.curatorId ?? "");
  // With no specialty set, infer one from the name's letter; it stays editable.
  const [specialtyId, setSpecialtyId] = useState(
    group.specialtyId || specialtyIdByLetter(group.name, specialties),
  );
  // Until the specialty is chosen by hand, keep inferring it from the letter.
  const [specialtyTouched, setSpecialtyTouched] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const refresh = useRefresh();

  function handleNameChange(value: string) {
    setName(value);
    if (!specialtyTouched) {
      setSpecialtyId(specialtyIdByLetter(value, specialties));
    }
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
        await updateGroup(group.id, {
          name,
          curatorId: curatorId || undefined,
          specialtyId: specialtyId || undefined,
        });
        refresh();
        setOpen(false);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : translate("common.error"));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <IconBtn tooltip={translate("common.edit")}>
          <IconPencil size={15} />
        </IconBtn>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{translate("ui.editTheGroup")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="flex flex-col gap-3 pt-2">
          <div className="flex flex-col gap-1">
            <Label>{translate("term.specialty")}</Label>
            <Select
              value={specialtyId || NONE}
              onValueChange={(v) => {
                setSpecialtyId(v === NONE ? "" : v);
                setSpecialtyTouched(true);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={translate("ui.notSelected")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{translate("ui.notSelected")}</SelectItem>
                {specialties.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.abbreviation || s.name}
                    {s.letter ? ` (${s.letter})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label required>{translate("common.name")}</Label>
            <Input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder={translate("ui.a101")}
            />
            <p className="text-xs text-muted-foreground">
              {translate("group.courseAuto", { course: formatCourse(name || group.name) })}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <Label>{translate("term.curator")}</Label>
            <Select
              value={curatorId || NONE}
              onValueChange={(v) => setCuratorId(v === NONE ? "" : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={translate("ui.notAssigned2")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{translate("ui.notAssigned2")}</SelectItem>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
