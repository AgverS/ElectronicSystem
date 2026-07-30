"use client";

import { useState, useTransition } from "react";
import { translate } from "@/lib/i18n/translate";
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
import { IconPlus, IconUserPlus, IconX } from "@tabler/icons-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { createUsers } from "@/lib/actions/admin";
import { buildLogin } from "@/components/admin/user-form";
import { useRefresh } from "@/lib/use-refresh";
import { Role } from "@/lib/prisma-client";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: translate("landing.role.admin.title"),
  TEACHER: translate("landing.role.teacher.title"),
  STUDENT: translate("landing.role.student.title"),
};

// Radix Select запрещает пустое значение у SelectItem — используем sentinel.
const NONE = "__none__";


type Row = {
  key: string;
  name: string;
  username: string;
  role: Role;
  groupId: string;
  specialtyIds: string[];
  error?: string;
};

function emptyRow(): Row {
  return {
    key: crypto.randomUUID(),
    name: "",
    username: "",
    role: Role.STUDENT,
    groupId: "",
    specialtyIds: [],
  };
}

function pluralUsers(n: number) {
  if (n === 1) return translate("ui.person");
  if (n >= 2 && n <= 4) return translate("ui.people");
  if (n % 100 >= 11 && n % 100 <= 19) return translate("ui.people");
  const mod = n % 10;
  if (mod === 1) return translate("ui.person");
  if (mod >= 2 && mod <= 4) return translate("ui.people");
  return translate("ui.people");
}

interface Props {
  groups: { id: string; name: string }[];
  specialties: { id: string; name: string; abbreviation: string }[];
  isMasterActor: boolean;
}

export function CreateUsersDialog({ groups, specialties, isMasterActor }: Props) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [pending, startTransition] = useTransition();
  const refresh = useRefresh();

  function handleOpenChange(v: boolean) {
    if (!v) setRows([emptyRow()]);
    setOpen(v);
  }

  function patchRow(key: string, patch: Partial<Row>) {
    setRows((prev) =>
      prev.map((r) =>
        r.key === key ? { ...r, ...patch, error: undefined } : r,
      ),
    );
  }

  function handleNameChange(key: string, name: string) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r;
        return { ...r, name, username: buildLogin(name), error: undefined };
      }),
    );
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function handleSubmit() {
    // Client-side validation
    const validated = rows.map((r) => {
      if (!r.name.trim()) return { ...r, error: translate("ui.enterAFullName") };
      return r;
    });
    if (validated.some((r) => r.error)) {
      setRows(validated);
      return;
    }

    startTransition(async () => {
      try {
        const { results } = await createUsers(
          rows.map((r) => ({
            name: r.name.trim(),
            username: r.username.trim(),
            role: r.role,
            groupId: r.role === Role.STUDENT ? r.groupId || undefined : undefined,
            curatedGroupId:
              r.role !== Role.STUDENT ? r.groupId || undefined : undefined,
            specialtyIds: r.role !== Role.STUDENT ? r.specialtyIds : undefined,
          })),
        );

        const remaining: Row[] = [];
        for (let i = 0; i < rows.length; i++) {
          if (!results[i].ok) {
            remaining.push({ ...rows[i], error: results[i].error });
          }
        }

        refresh();
        if (remaining.length === 0) {
          setOpen(false);
          setRows([emptyRow()]);
        } else {
          setRows(remaining);
        }
      } catch (err) {
        setRows((prev) => {
          const next = [...prev];
          if (next[0])
            next[0] = {
              ...next[0],
              error: err instanceof Error ? err.message : translate("common.error"),
            };
          return next;
        });
      }
    });
  }

  const filled = rows.filter((r) => r.name.trim()).length;

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <IconUserPlus size={16} />
        {translate("ui.addPeople")}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-4xl gap-4">
          <DialogHeader>
            <DialogTitle>{translate("ui.addPeople2")}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            {/* Column headers */}
            <div className="hidden sm:grid grid-cols-[1fr_1fr_9rem_11.5rem_2rem] gap-2 px-0.5">
              <Label required className="text-xs font-medium text-muted-foreground">
                {translate("ui.fullName")}
              </Label>
              <Label className="text-xs font-medium text-muted-foreground">
                {translate("ui.username")}
              </Label>
              <Label className="text-xs font-medium text-muted-foreground">
                {translate("ui.role")}
              </Label>
              <Label className="text-xs font-medium text-muted-foreground">
                {translate("ui.groupCurator")}
              </Label>
              <span />
            </div>

            {/* Rows */}
            <div className="flex max-h-[420px] flex-col gap-3 sm:gap-1.5 overflow-y-auto">
              {rows.map((row) => (
                <div key={row.key} className="border-b pb-3 sm:border-b-0 sm:pb-0">
                  <div className="flex flex-col gap-2 sm:grid sm:grid-cols-[1fr_1fr_9rem_11.5rem_2rem] sm:items-center sm:gap-2">
                    <div className="flex flex-col gap-1 sm:block">
                      <Label className="text-[10px] font-medium text-muted-foreground sm:hidden">{translate("ui.fullName")}</Label>
                      <Input
                        placeholder={translate("ui.ameliaNovak")}
                        value={row.name}
                        onChange={(e) =>
                          handleNameChange(row.key, e.target.value)
                        }
                        className={cn(
                          "h-8 text-sm",
                          row.error &&
                          "border-destructive focus-visible:ring-destructive/50",
                        )}
                      />
                    </div>
                    <div className="flex flex-col gap-1 sm:block">
                      <Label className="text-[10px] font-medium text-muted-foreground sm:hidden">{translate("ui.username")}</Label>
                      <Input
                        placeholder={translate("ui.aNovak")}
                        value={row.username}
                        onChange={(e) =>
                          patchRow(row.key, { username: e.target.value })
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1 sm:block">
                      <Label className="text-[10px] font-medium text-muted-foreground sm:hidden">{translate("ui.role")}</Label>
                      <Select
                        value={row.role}
                        onValueChange={(v) => {
                          const nextRole = v as Role;
                          patchRow(row.key, {
                            role: nextRole,
                            groupId: "",
                            specialtyIds: [],
                          });
                        }}
                      >
                        <SelectTrigger size="sm" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ROLE_LABELS)
                            .filter(([v]) => isMasterActor || v !== Role.ADMIN)
                            .map(([v, l]) => (
                              <SelectItem key={v} value={v}>
                                {l}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1 sm:block">
                      <Label className="text-[10px] font-medium text-muted-foreground sm:hidden">
                        {row.role === Role.STUDENT ? translate("term.group") : translate("ui.groupSpecialties")}
                      </Label>
                      {row.role === Role.STUDENT ? (
                        <Select
                          value={row.groupId || NONE}
                          onValueChange={(v) =>
                            patchRow(row.key, { groupId: v === NONE ? "" : v })
                          }
                        >
                          <SelectTrigger size="sm" className="w-full">
                            <SelectValue placeholder={translate("ui.notSelected")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>{translate("ui.notSelected")}</SelectItem>
                            {groups.map((g) => (
                              <SelectItem key={g.id} value={g.id}>
                                {g.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex flex-col gap-1.5 sm:gap-1">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-full justify-start font-normal text-left truncate text-xs"
                              >
                                {row.specialtyIds.length === 0
                                  ? translate("ui.specialtiesNone")
                                  : `Спец-ти: ${row.specialtyIds
                                      .map((sid) => specialties.find((s) => s.id === sid)?.abbreviation || "?")
                                      .join(", ")}`}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-3" align="start">
                              <div className="flex flex-col gap-2">
                                <p className="text-xs font-semibold text-muted-foreground">
                                  {translate("ui.selectSpecialties")}
                                </p>
                                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                                  {specialties.map((spec) => {
                                    const isChecked = row.specialtyIds.includes(spec.id);
                                    return (
                                      <div
                                        key={spec.id}
                                        onClick={() => {
                                          const nextIds = isChecked
                                            ? row.specialtyIds.filter((id) => id !== spec.id)
                                            : [...row.specialtyIds, spec.id];
                                          patchRow(row.key, { specialtyIds: nextIds });
                                        }}
                                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-muted select-none"
                                      >
                                        <Checkbox checked={isChecked} />
                                        <span className="truncate">
                                          {spec.abbreviation ? `${spec.abbreviation} — ` : ""}{spec.name}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>

                          <Select
                            value={row.groupId || NONE}
                            onValueChange={(v) =>
                              patchRow(row.key, { groupId: v === NONE ? "" : v })
                            }
                          >
                            <SelectTrigger size="sm" className="w-full">
                              <SelectValue placeholder={translate("ui.groupCurator2")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NONE}>{translate("ui.groupCurator2")}</SelectItem>
                              {groups.map((g) => (
                                <SelectItem key={g.id} value={g.id}>
                                  {g.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end sm:block">
                      <button
                        type="button"
                        onClick={() => removeRow(row.key)}
                        disabled={rows.length === 1}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-25"
                      >
                        <IconX size={14} />
                      </button>
                    </div>
                  </div>
                  {row.error && (
                    <p className="mt-0.5 pl-0.5 text-xs text-destructive">
                      {row.error}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addRow}
              className="flex w-fit items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <IconPlus size={14} />
              {translate("ui.addARow")}
            </button>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={pending}
            >
              {translate("common.cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={pending || filled === 0}>
              {pending
                ? translate("ui.creating")
                : filled === 0
                  ? translate("common.create")
                  : `Создать ${filled} ${pluralUsers(filled)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
