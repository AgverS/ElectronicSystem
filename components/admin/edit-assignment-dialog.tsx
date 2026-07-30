"use client";

import { useMemo, useState, useTransition } from "react";
import { translate } from "@/lib/i18n/translate";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { IconCheck, IconSearch } from "@tabler/icons-react";
import { updateAssignment } from "@/lib/actions/admin";
import { useRefresh } from "@/lib/use-refresh";
import { cn } from "@/lib/utils";

export interface EditAssignmentData {
  subjectId: string;
  subjectName: string;
  prevAssignmentIds: string[];
  teacherIds: string[];
  groupIds: string[];
}

interface EditAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: EditAssignmentData | null;
  teachers: { id: string; name: string }[];
  groups: { id: string; name: string }[];
}

export function EditAssignmentDialog({
  open,
  onOpenChange,
  data,
  teachers,
  groups,
}: EditAssignmentDialogProps) {
  // Keep the last data so the content does not vanish during the closing animation.
  const [retained, setRetained] = useState<EditAssignmentData | null>(data);
  const [teacherIds, setTeacherIds] = useState<Set<string>>(new Set());
  const [teacherSearch, setTeacherSearch] = useState("");
  const [groupIds, setGroupIds] = useState<Set<string>>(new Set());
  const [groupSearch, setGroupSearch] = useState("");
  const [error, setError] = useState("");
  const [synced, setSynced] = useState(false);
  const [pending, startTransition] = useTransition();
  const refresh = useRefresh();

  // Synchronised on open during render, without an effect.
  if (open && data && !synced) {
    setSynced(true);
    setRetained(data);
    setTeacherIds(new Set(data.teacherIds));
    setGroupIds(new Set(data.groupIds));
    setTeacherSearch("");
    setGroupSearch("");
    setError("");
  }
  if (!open && synced) {
    setSynced(false);
  }

  const filteredTeachers = useMemo(() => {
    const q = teacherSearch.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((t) => t.name.toLowerCase().includes(q));
  }, [teachers, teacherSearch]);

  const filteredGroups = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(q));
  }, [groups, groupSearch]);

  const allFilteredSelected =
    filteredGroups.length > 0 && filteredGroups.every((g) => groupIds.has(g.id));

  function toggleTeacher(id: string) {
    setTeacherIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleGroup(id: string) {
    setGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllFiltered() {
    setGroupIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredGroups.forEach((g) => next.delete(g.id));
      } else {
        filteredGroups.forEach((g) => next.add(g.id));
      }
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!retained) return;
    if (teacherIds.size === 0 || groupIds.size === 0) {
      setError(translate("ui.selectAtLeastOneTeacherAndAtLeast"));
      return;
    }
    startTransition(async () => {
      try {
        await updateAssignment({
          subjectId: retained.subjectId,
          teacherIds: [...teacherIds],
          groupIds: [...groupIds],
          prevAssignmentIds: retained.prevAssignmentIds,
        });
        refresh();
        onOpenChange(false);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : translate("common.error"));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] flex-col gap-4 overflow-hidden">
        <DialogHeader>
          <DialogTitle>{translate("ui.editTheAssignment2")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
          <div className="rounded-lg border bg-muted/20 px-3 py-2 text-sm">
            <span className="block text-xs text-muted-foreground">{translate("term.subject")}</span>
            <span className="font-semibold text-foreground">{retained?.subjectName}</span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
            <div className="flex flex-col gap-1.5">
              <Label required>
                {translate("assignment.teachers")}
                {teacherIds.size > 0 && (
                  <span className="ml-1.5 text-muted-foreground">{translate("ui.selectedInline", { count: teacherIds.size })}</span>
                )}
              </Label>

              <div className="relative">
                <IconSearch
                  size={15}
                  className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  placeholder={translate("ui.searchTeachers")}
                  className="h-8 pl-8"
                />
              </div>

              <div className="overflow-y-auto rounded-md border p-1" style={{ maxHeight: "10rem" }}>
                {filteredTeachers.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    {translate("ui.noTeachersFound")}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-0.5">
                    {filteredTeachers.map((t) => {
                      const checked = teacherIds.has(t.id);
                      return (
                        <button
                          type="button"
                          key={t.id}
                          onClick={() => toggleTeacher(t.id)}
                          className={cn(
                            "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted",
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
                          <span className="truncate">{t.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label required>
                  {translate("assignment.groups")}
                  {groupIds.size > 0 && (
                    <span className="ml-1.5 text-muted-foreground">{translate("ui.selectedInline", { count: groupIds.size })}</span>
                  )}
                </Label>
                {filteredGroups.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleAllFiltered}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {allFilteredSelected ? translate("ui.clearAll") : translate("ui.selectAll")}
                  </button>
                )}
              </div>

              <div className="relative">
                <IconSearch
                  size={15}
                  className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                  placeholder={translate("ui.searchGroups")}
                  className="h-8 pl-8"
                />
              </div>

              <div className="overflow-y-auto rounded-md border p-1" style={{ maxHeight: "13rem" }}>
                {filteredGroups.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">{translate("ui.noGroupsFound2")}</p>
                ) : (
                  <div className="grid grid-cols-2 gap-0.5">
                    {filteredGroups.map((g) => {
                      const checked = groupIds.has(g.id);
                      return (
                        <button
                          type="button"
                          key={g.id}
                          onClick={() => toggleGroup(g.id)}
                          className={cn(
                            "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted",
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
                          <span className="truncate tabular-nums">{g.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <DialogFooter className="mt-auto border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              {translate("common.cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? translate("common.saving") : translate("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
