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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { IconPlus, IconCheck, IconSearch } from "@tabler/icons-react";
import { createAssignment } from "@/lib/actions/admin";
import { useRefresh } from "@/lib/use-refresh";
import { cn } from "@/lib/utils";


interface Props {
  teachers: { id: string; name: string }[];
  groups: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
}

export function CreateAssignmentDialog({ teachers, groups, subjects }: Props) {
  const [open, setOpen] = useState(false);
  const [teacherIds, setTeacherIds] = useState<Set<string>>(new Set());
  const [teacherSearch, setTeacherSearch] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [groupIds, setGroupIds] = useState<Set<string>>(new Set());
  const [groupSearch, setGroupSearch] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const refresh = useRefresh();

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

  const subjectOptions = useMemo(() => {
    return subjects.map((s) => ({ value: s.id, label: s.name }));
  }, [subjects]);

  const allFilteredSelected =
    filteredGroups.length > 0 && filteredGroups.every((g) => groupIds.has(g.id));

  function reset() {
    setTeacherIds(new Set());
    setTeacherSearch("");
    setSubjectId("");
    setGroupIds(new Set());
    setGroupSearch("");
    setError("");
  }

  function handleOpenChange(v: boolean) {
    if (!v) reset();
    setOpen(v);
  }

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

  function handleSubmit() {
    setError("");
    if (teacherIds.size === 0 || !subjectId || groupIds.size === 0) {
      setError(translate("ui.selectATeacherASubjectAndAtLeast"));
      return;
    }
    startTransition(async () => {
      try {
        await createAssignment({
          teacherIds: [...teacherIds],
          subjectId,
          groupIds: [...groupIds],
        });
        refresh();
        handleOpenChange(false);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : translate("common.error"));
      }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <IconPlus size={16} />
        {translate("ui.newAssignment")}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex max-h-[88vh] flex-col gap-4 overflow-hidden">
          <DialogHeader>
            <DialogTitle>{translate("ui.newAssignment")}</DialogTitle>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label required>
                  {translate("assignment.teachers")}
                  {teacherIds.size > 0 && (
                    <span className="ml-1.5 text-muted-foreground">{translate("ui.selectedInline", { count: teacherIds.size })}</span>
                  )}
                </Label>
              </div>

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

              <div
                className="overflow-y-auto rounded-md border p-1"
                style={{ maxHeight: "10rem" }}
              >
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
            <div className="flex flex-col gap-1">
              <Label required>{translate("term.subject")}</Label>
              <SearchableSelect
                value={subjectId}
                onValueChange={setSubjectId}
                options={subjectOptions}
                placeholder={translate("ui.select2")}
                searchPlaceholder={translate("ui.searchSubjects")}
                className="w-full"
                portalled={false}
              />
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

              <div
                className="overflow-y-auto rounded-md border p-1"
                style={{ maxHeight: "13rem" }}
              >
                {filteredGroups.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    {translate("ui.noGroupsFound2")}
                  </p>
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

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={pending}
            >
              {translate("common.cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={pending}>
              {pending
                ? translate("ui.creating")
                : groupIds.size > 1
                  ? translate("group.createN", { count: groupIds.size })
                  : translate("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
