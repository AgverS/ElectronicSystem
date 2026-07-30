"use client";

import { useState, useTransition } from "react";
import { translate } from "@/lib/i18n/translate";
import { IconPlus, IconPencil, IconDeviceFloppy, IconX } from "@tabler/icons-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconBtn } from "@/components/ui/icon-btn";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import {
  createSpecialty,
  updateSpecialty,
  deleteSpecialty,
} from "@/lib/actions/admin";
import { useRefresh } from "@/lib/use-refresh";

interface SpecialtyItem {
  id: string;
  name: string;
  abbreviation: string;
  letter: string;
  subjectsCount: number;
  groupsCount: number;
  usersCount: number;
}

interface Props {
  specialties: SpecialtyItem[];
  canManage: boolean;
}

export function SpecialtiesManager({ specialties, canManage }: Props) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAbbreviation, setNewAbbreviation] = useState("");
  const [newLetter, setNewLetter] = useState("");
  const [addError, setAddError] = useState("");
  const [pending, startTransition] = useTransition();
  const refresh = useRefresh();

  function handleAdd() {
    const name = newName.trim();
    const abbreviation = newAbbreviation.trim();
    const letter = newLetter.trim().toUpperCase().slice(0, 1);
    if (!name) { setAddError(translate("ui.enterAName")); return; }
    if (!letter) { setAddError(translate("ui.enterALetter")); return; }
    setAddError("");
    startTransition(async () => {
      try {
        await createSpecialty({ name, letter, abbreviation: abbreviation || undefined });
        setNewName("");
        setNewAbbreviation("");
        setNewLetter("");
        setAdding(false);
        refresh();
      } catch (err: unknown) {
        setAddError(err instanceof Error ? err.message : translate("common.error"));
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <div className="flex justify-end">
          {!adding ? (
            <Button onClick={() => setAdding(true)} className="gap-2">
              <IconPlus size={16} />
              {translate("ui.addASpecialty")}
            </Button>
          ) : (
            <div className="flex items-end gap-2">
              <div className="flex flex-col gap-1">
                <Label required className="text-xs text-muted-foreground">{translate("common.name")}</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={translate("ui.softwareDevelopment")}
                  className="w-48"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">{translate("ui.abbreviation")}</Label>
                <Input
                  value={newAbbreviation}
                  onChange={(e) => setNewAbbreviation(e.target.value)}
                  placeholder={translate("ui.sd")}
                  className="w-24"
                  onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label required className="text-xs text-muted-foreground">{translate("ui.letter")}</Label>
                <Input
                  value={newLetter}
                  onChange={(e) => setNewLetter(e.target.value.slice(0, 1))}
                  placeholder="S"
                  maxLength={1}
                  className="w-16 text-center"
                  onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }}
                />
              </div>
              <Button onClick={handleAdd} disabled={pending} className="gap-1.5">
                <IconDeviceFloppy size={16} />
                {translate("common.save")}
              </Button>
              <Button variant="outline" onClick={() => { setAdding(false); setAddError(""); }} disabled={pending}>
                <IconX size={16} />
              </Button>
            </div>
          )}
        </div>
      )}
      {addError && <p className="text-xs text-destructive text-right">{addError}</p>}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{translate("common.name")}</TableHead>
              <TableHead className="w-32">{translate("ui.abbreviation")}</TableHead>
              <TableHead className="w-24">{translate("ui.letter")}</TableHead>
              <TableHead className="w-28">{translate("nav.subjects")}</TableHead>
              <TableHead className="w-24">{translate("nav.groups")}</TableHead>
              <TableHead className="w-28">{translate("ui.staff2")}</TableHead>
              {canManage && <TableHead className="w-20" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {specialties.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canManage ? 7 : 6}
                  className="py-12 text-center text-muted-foreground"
                >
                  {translate("ui.noSpecialtiesYet")}
                </TableCell>
              </TableRow>
            ) : (
              specialties.map((s) => (
                <SpecialtyRow
                  key={s.id}
                  specialty={s}
                  canManage={canManage}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function SpecialtyRow({
  specialty,
  canManage,
}: {
  specialty: SpecialtyItem;
  canManage: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(specialty.name);
  const [abbreviation, setAbbreviation] = useState(specialty.abbreviation);
  const [letter, setLetter] = useState(specialty.letter);
  const [pending, startTransition] = useTransition();
  const refresh = useRefresh();

  const nameChanged = name.trim() !== specialty.name;
  const abbreviationChanged = abbreviation.trim() !== specialty.abbreviation;
  const letterChanged = letter.trim().toUpperCase() !== specialty.letter;
  const changed = (nameChanged || letterChanged || abbreviationChanged) && name.trim().length > 0 && letter.trim().length > 0;

  function handleSave() {
    if (!changed) return;
    startTransition(async () => {
      await updateSpecialty(specialty.id, {
        name: name.trim(),
        abbreviation: abbreviation.trim(),
        letter: letter.trim().toUpperCase().slice(0, 1),
      });
      setEditing(false);
      refresh();
    });
  }

  function handleCancel() {
    setName(specialty.name);
    setAbbreviation(specialty.abbreviation);
    setLetter(specialty.letter);
    setEditing(false);
  }

  if (editing) {
    return (
      <TableRow>
        <TableCell>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") handleCancel(); }}
          />
        </TableCell>
        <TableCell>
          <Input
            value={abbreviation}
            onChange={(e) => setAbbreviation(e.target.value)}
            className="h-8 w-24"
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") handleCancel(); }}
          />
        </TableCell>
        <TableCell>
          <Input
            value={letter}
            onChange={(e) => setLetter(e.target.value.slice(0, 1))}
            maxLength={1}
            className="h-8 w-16 text-center"
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") handleCancel(); }}
          />
        </TableCell>
        <TableCell>{specialty.subjectsCount}</TableCell>
        <TableCell>{specialty.groupsCount}</TableCell>
        <TableCell>{specialty.usersCount}</TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            <IconBtn tooltip={translate("common.save")} onClick={handleSave} disabled={pending || !changed} className="disabled:opacity-40">
              <IconDeviceFloppy size={16} />
            </IconBtn>
            <IconBtn tooltip={translate("common.cancel")} onClick={handleCancel} disabled={pending}>
              <IconX size={16} />
            </IconBtn>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell className="font-medium">
        <div className="max-w-[400px] truncate" title={specialty.name}>
          {specialty.name}
        </div>
      </TableCell>
      <TableCell className="font-mono text-sm">{specialty.abbreviation || "—"}</TableCell>
      <TableCell>
        <span className="inline-flex size-7 items-center justify-center rounded-md border bg-muted font-mono text-sm font-semibold">
          {specialty.letter || "—"}
        </span>
      </TableCell>
      <TableCell className="text-muted-foreground">{specialty.subjectsCount}</TableCell>
      <TableCell className="text-muted-foreground">{specialty.groupsCount}</TableCell>
      <TableCell className="text-muted-foreground">{specialty.usersCount}</TableCell>
      {canManage && (
        <TableCell>
          <div className="flex items-center gap-1">
            <IconBtn tooltip={translate("common.edit")} onClick={() => setEditing(true)}>
              <IconPencil size={15} />
            </IconBtn>
            <DeleteDialog
              label={translate("ui.deleteNamed", { name: specialty.name })}
              action={() => deleteSpecialty(specialty.id)}
            />
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}
