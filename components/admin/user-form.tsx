"use client";

import { useState, useTransition } from "react";
import { translate } from "@/lib/i18n/translate";
import { IconCheck } from "@tabler/icons-react";
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
import { createUser, updateUser } from "@/lib/actions/admin";
import { Role } from "@/lib/prisma-client";
import { useRefresh } from "@/lib/use-refresh";
import { cn } from "@/lib/utils";

export function buildLogin(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "";
  const lastName = parts[0];
  const firstInitial = parts[1] ? parts[1][0] + "." : "";
  const patronymicInitial = parts[2] ? parts[2][0] + "." : "";
  return lastName + (firstInitial ? " " + firstInitial + patronymicInitial : "");
}

interface Option {
  id: string;
  name: string;
  abbreviation?: string;
}

interface UserFormProps {
  groups: Option[];
  allSpecialties?: Option[];
  initial?: {
    id: string;
    name: string;
    username: string | null;
    role: Role;
    groupId: string | null;
    specialtyIds?: string[];
    curatedGroupIds?: string[];
  };
  onDone?: () => void;
  isMasterActor?: boolean;
}

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: translate("landing.role.admin.title"),
  TEACHER: translate("landing.role.teacher.title"),
  STUDENT: translate("landing.role.student.title"),
};

// Radix Select запрещает пустое значение у SelectItem — используем sentinel.
const NONE = "__none__";


function CheckList({
  label,
  options,
  selected,
  onToggle,
  emptyHint,
}: {
  label: string;
  options: Option[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  emptyHint: string;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <Label>
        {label}
        {selected.size > 0 && (
          <span className="ml-1.5 text-muted-foreground">{translate("ui.selectedInline", { count: selected.size })}</span>
        )}
      </Label>
      {options.length === 0 ? (
        <p className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
          {emptyHint}
        </p>
      ) : (
        <div className="flex max-h-44 flex-col gap-1 overflow-y-auto rounded-md border p-2 pr-2">
          {options.map((o) => {
            const checked = selected.has(o.id);
            return (
              <button
                type="button"
                key={o.id}
                onClick={() => onToggle(o.id)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                  checked && "bg-muted/60",
                )}
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                    checked
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input",
                  )}
                >
                  {checked && <IconCheck size={12} stroke={3} />}
                </span>
                <span className="truncate">
                  {o.abbreviation ? `${o.abbreviation} — ` : ""}{o.name}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function UserForm({
  groups,
  allSpecialties = [],
  initial,
  onDone,
  isMasterActor = false,
}: UserFormProps) {
  const isCreating = !initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [username, setUsername] = useState(
    initial?.username ?? initial?.name ?? "",
  );

  function handleNameChange(value: string) {
    setName(value);
    if (isCreating) setUsername(buildLogin(value));
  }
  const [role, setRole] = useState<Role>(initial?.role ?? Role.STUDENT);
  const [groupId, setGroupId] = useState(initial?.groupId ?? "");
  const [specialtyIds, setSpecialtyIds] = useState<Set<string>>(
    new Set(initial?.specialtyIds ?? []),
  );
  const [curatedGroupIds, setCuratedGroupIds] = useState<Set<string>>(
    new Set(initial?.curatedGroupIds ?? []),
  );
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const refresh = useRefresh();

  function toggle(setter: typeof setSpecialtyIds, id: string) {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const isStaff = role === Role.TEACHER || role === Role.ADMIN;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !username.trim()) {
      setError(translate("ui.fillInEveryField"));
      return;
    }
    startTransition(async () => {
      try {
        const payload = {
          name,
          username,
          role,
          groupId: groupId || undefined,
          specialtyIds: isStaff ? [...specialtyIds] : undefined,
          curatedGroupIds: isStaff ? [...curatedGroupIds] : undefined,
        };
        if (initial) {
          await updateUser(initial.id, payload);
        } else {
          await createUser(payload);
          setName("");
          setUsername("");
          setRole(Role.STUDENT);
          setGroupId("");
          setSpecialtyIds(new Set());
          setCuratedGroupIds(new Set());
        }
        refresh();
        onDone?.();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : translate("common.error"));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label required>{translate("ui.fullName")}</Label>
        <Input
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder={translate("ui.ameliaNovak")}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label required>{translate("ui.usernameForSigningIn")}</Label>
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder={translate("ui.aNovak")}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label required>{translate("ui.role")}</Label>
        <Select value={role} onValueChange={(v) => setRole(v as Role)}>
          <SelectTrigger className="w-full">
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
      {role === Role.STUDENT && (
        <div className="flex flex-col gap-1">
          <Label required>{translate("term.group")}</Label>
          <Select
            value={groupId || NONE}
            onValueChange={(v) => setGroupId(v === NONE ? "" : v)}
          >
            <SelectTrigger className="w-full">
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
        </div>
      )}
      {isStaff && (
        <>
          <CheckList
            label={translate("nav.specialties")}
            options={allSpecialties}
            selected={specialtyIds}
            onToggle={(id) => toggle(setSpecialtyIds, id)}
            emptyHint={translate("ui.createSomeSpecialtiesFirst")}
          />
          <CheckList
            label={translate("ui.curatedGroups")}
            options={groups}
            selected={curatedGroupIds}
            onToggle={(id) => toggle(setCuratedGroupIds, id)}
            emptyHint={translate("ui.createSomeGroupsFirst")}
          />
        </>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? translate("common.saving") : initial ? translate("common.save") : translate("common.create")}
      </Button>
    </form>
  );
}
