"use client";

import { useState } from "react";
import { translate } from "@/lib/i18n/translate";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  upsertScheduleEntry,
  deleteScheduleEntry,
  getLastCreatedScheduleEntry,
} from "@/lib/actions/schedule";
import { SubstitutionGrid } from "@/components/admin/substitution-grid";
import {
  IconPlus,
  IconPencil,
  IconAlertTriangle,
  IconUsers,
  IconCopy,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

type Entry = {
  id: string;
  groupId: string;
  dayOfWeek: number;
  lessonNumber: number;
  subgroup: string;
  room: string;
  subject: { id: string; name: string };
  teacher: { id: string; name: string };
  group: { id: string; name: string };
};

type Group = { id: string; name: string };
type Subject = { id: string; name: string };
type Teacher = { id: string; name: string };
type Assignment = { teacherId: string; subjectId: string };

// Built on each call: the labels are translated, and the catalog is not
// loaded yet when this module is first imported.
function DAYS() {
  return [
  { num: 1, label: translate("day.1.short") },
  { num: 2, label: translate("day.2.short") },
  { num: 3, label: translate("day.3.short") },
  { num: 4, label: translate("day.4.short") },
  { num: 5, label: translate("day.5.short") },
  { num: 6, label: translate("day.6.short") },
];
}

const LESSONS = Array.from({ length: 13 }, (_, i) => i + 1);

interface DialogState {
  open: boolean;
  dayOfWeek: number;
  lessonNumber: number;
  entry?: Entry;
}

export function AdminScheduleGrid() {
  const [groupId, setGroupId] = useState<string>("");
  const [tab, setTab] = useState<"base" | "subs">("subs");
  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    dayOfWeek: 1,
    lessonNumber: 1,
  });
  const [subjectId, setSubjectId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [room, setRoom] = useState("");
  const [subgroup, setSubgroup] = useState("");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ["schedule-groups"],
    queryFn: async () => (await fetch("/api/groups")).json(),
  });

  const { data: subjects } = useQuery<{ data: Subject[] }>({
    queryKey: ["admin-subjects-all"],
    queryFn: async () => (await fetch("/api/admin/subjects?limit=200")).json(),
  });

  const { data: teachersRes } = useQuery<{ data: Teacher[] }>({
    queryKey: ["admin-teachers-all"],
    queryFn: async () =>
      (await fetch("/api/admin/users?roles=TEACHER,ADMIN&limit=200")).json(),
  });

  const { data: entries = [] } = useQuery<Entry[]>({
    queryKey: ["schedule", groupId],
    queryFn: async () =>
      groupId ? (await fetch(`/api/schedule?groupId=${groupId}`)).json() : [],
    enabled: !!groupId,
  });

  const { data: assignmentsRes } = useQuery<{ data: Assignment[] }>({
    queryKey: ["admin-assignments-group", groupId],
    queryFn: async () =>
      groupId
        ? (
          await fetch(`/api/admin/assignments?groupId=${groupId}&limit=200`)
        ).json()
        : { data: [] },
    enabled: !!groupId,
  });
  const groupAssignments = assignmentsRes?.data ?? [];

  const { data: teacherEntries = [] } = useQuery<Entry[]>({
    queryKey: ["schedule-teacher", teacherId],
    queryFn: async () =>
      teacherId
        ? (await fetch(`/api/schedule?teacherId=${teacherId}`)).json()
        : [],
    enabled: !!teacherId && dialog.open,
  });

  const teacherConflict =
    dialog.open && teacherId
      ? teacherEntries.find(
        (e) =>
          e.dayOfWeek === dialog.dayOfWeek &&
          e.lessonNumber === dialog.lessonNumber &&
          e.id !== dialog.entry?.id,
      )
      : null;

  const entryMap = new Map<string, Entry[]>();
  for (const e of entries) {
    const key = `${e.dayOfWeek}-${e.lessonNumber}`;
    const arr = entryMap.get(key) ?? [];
    arr.push(e);
    entryMap.set(key, arr);
  }

  function openDialog(
    dayOfWeek: number,
    lessonNumber: number,
    entry?: Entry,
    defaultSubgroup?: string,
  ) {
    setDialog({ open: true, dayOfWeek, lessonNumber, entry });
    setSubjectId(entry?.subject.id ?? "");
    setTeacherId(entry?.teacher.id ?? "");
    setRoom(entry?.room ?? "");
    setSubgroup(entry?.subgroup ?? defaultSubgroup ?? "");
  }

  async function handleCopyPrevious() {
    setSaving(true);
    try {
      const last = await getLastCreatedScheduleEntry();
      if (last) {
        setSubjectId(last.subjectId);
        setTeacherId(last.teacherId);
        setRoom(last.room);
        if (last.subgroup) setSubgroup(last.subgroup);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (!groupId || !subjectId || !teacherId || !room.trim()) return;
    setSaving(true);
    try {
      await upsertScheduleEntry({
        id: dialog.entry?.id,
        groupId,
        dayOfWeek: dialog.dayOfWeek,
        lessonNumber: dialog.lessonNumber,
        subgroup,
        subjectId,
        teacherId,
        room: room.trim(),
      });
      queryClient.invalidateQueries({ queryKey: ["schedule", groupId] });
      setDialog((d) => ({ ...d, open: false }));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!dialog.entry) return;
    setSaving(true);
    try {
      await deleteScheduleEntry(dialog.entry.id);
      queryClient.invalidateQueries({ queryKey: ["schedule", groupId] });
      setDialog((d) => ({ ...d, open: false }));
    } finally {
      setSaving(false);
    }
  }

  const subjectList: Subject[] = subjects?.data ?? [];
  const teacherList: Teacher[] = teachersRes?.data ?? [];

  const dayLabel = DAYS().find((d) => d.num === dialog.dayOfWeek)?.label ?? "";

  const TABS = [
    { key: "subs" as const, label: translate("ui.coverLessons") },
    { key: "base" as const, label: translate("bells.permanent") },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3">
          <Label className="shrink-0">{translate("term.group")}</Label>
          <SearchableSelect
            value={groupId}
            onValueChange={setGroupId}
            options={groups.map((g) => ({ value: g.id, label: g.name }))}
            placeholder={translate("ui.selectAGroup")}
            className="w-48"
          />
        </div>

        <div className="flex rounded-md border overflow-hidden">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "px-4 py-1.5 text-sm transition-colors",
                tab === t.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "subs" && groupId && <SubstitutionGrid groupId={groupId} />}

      {!groupId && (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border-2 border-dashed bg-muted/5 p-8 text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="rounded-full bg-muted p-4 mb-4">
            <IconUsers size={40} className="text-muted-foreground/60" />
          </div>
          <h3 className="text-lg font-semibold tracking-tight">
            {translate("ui.noGroupSelected")}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-[280px] leading-relaxed">
            Выберите учебную группу в списке выше, чтобы{" "}
            {tab === "subs" ? "управлять заменами" : "редактировать расписание"}
            .
          </p>
        </div>
      )}

      {tab === "base" && groupId && (
        <div className="overflow-auto rounded-lg border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="border-r px-3 py-2 text-center font-medium text-muted-foreground w-10">
                  №
                </th>
                {DAYS().map((d) => (
                  <th
                    key={d.num}
                    className="px-3 py-2 text-center font-medium min-w-36"
                  >
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LESSONS.map((lessonNum) => (
                <tr key={lessonNum} className="border-t">
                  <td className="border-r px-3 py-2 text-center text-muted-foreground font-medium">
                    {lessonNum}
                  </td>
                  {DAYS().map((d) => {
                    const cellEntries =
                      entryMap.get(`${d.num}-${lessonNum}`) ?? [];
                    return (
                      <td key={d.num} className="px-2 py-1.5">
                        <div className="flex flex-col gap-1">
                          {cellEntries.map((entry, idx) => (
                            <div key={entry.id}>
                              {idx > 0 && (
                                <div className="mb-1 border-t border-dashed border-border/60" />
                              )}
                              <button
                                onClick={() =>
                                  openDialog(d.num, lessonNum, entry)
                                }
                                className="w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted transition-colors group flex items-start gap-1"
                              >
                                <div className="flex-1 min-w-0">
                                  {entry.subgroup && (
                                    <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{translate("ui.subgroupShort", { subgroup: entry.subgroup })}</div>
                                  )}
                                  <div className="font-medium text-foreground truncate">
                                    {entry.subject.name}
                                  </div>
                                  <div className="text-muted-foreground truncate">
                                    {entry.teacher.name}
                                  </div>
                                  <div className="text-muted-foreground">{translate("ui.roomShort", { room: entry.room })}</div>
                                </div>
                                <IconPencil
                                  size={12}
                                  className="mt-0.5 shrink-0 opacity-0 group-hover:opacity-50"
                                />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              const nextSubgroup =
                                cellEntries.length === 0
                                  ? ""
                                  : String(cellEntries.length + 1);
                              openDialog(
                                d.num,
                                lessonNum,
                                undefined,
                                nextSubgroup,
                              );
                            }}
                            className={cn(
                              "w-full rounded-md flex items-center justify-center text-muted-foreground/30 hover:text-muted-foreground hover:bg-muted transition-colors",
                              cellEntries.length === 0
                                ? "min-h-8"
                                : "h-6 mt-0.5",
                            )}
                          >
                            <IconPlus size={14} />
                          </button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
      >
        <DialogContent>
          <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-0 pr-8">
            <DialogTitle>
              Урок {dialog.lessonNumber} · {dayLabel}
            </DialogTitle>
            {!dialog.entry && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-muted-foreground"
                onClick={handleCopyPrevious}
                disabled={saving}
              >
                <IconCopy size={14} />
                {translate("ui.copyFromLastWeek")}
              </Button>
            )}
          </DialogHeader>

          <div className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-1.5">
              <Label required>{translate("term.subject")}</Label>
              <SearchableSelect
                value={subjectId}
                onValueChange={(val) => {
                  setSubjectId(val);
                  const match = groupAssignments.find(
                    (a) => a.subjectId === val,
                  );
                  if (match) setTeacherId(match.teacherId);
                }}
                options={subjectList.map((s) => ({
                  value: s.id,
                  label: s.name,
                }))}
                placeholder={translate("ui.selectASubject")}
                className="w-full"
                portalled={false}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label required>{translate("landing.role.teacher.title")}</Label>
              <SearchableSelect
                value={teacherId}
                onValueChange={setTeacherId}
                options={teacherList.map((t) => ({
                  value: t.id,
                  label: t.name,
                }))}
                placeholder={translate("ui.selectATeacher")}
                className="w-full"
                portalled={false}
              />
            </div>

            {teacherConflict && (
              <div className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-300">
                <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>
                  Преподаватель уже ведёт урок {dialog.lessonNumber} в группе{" "}
                  <strong>{teacherConflict.group.name}</strong>
                  {teacherConflict.subgroup
                    ? ` (подгр. ${teacherConflict.subgroup})`
                    : ""}
                  {teacherConflict.room ? `, каб. ${teacherConflict.room}` : ""}
                  .
                </span>
              </div>
            )}

            <div className="flex gap-3">
              <div className="flex flex-col gap-1.5 flex-1">
                <Label required>{translate("common.room")}</Label>
                <Input
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder={translate("ui.forExample301")}
                />
              </div>
              <div className="flex flex-col gap-1.5 w-28">
                <Label>{translate("term.subgroup")}</Label>
                <Input
                  value={subgroup}
                  onChange={(e) => setSubgroup(e.target.value)}
                  placeholder="1, 2, …"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              {dialog.entry ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  {translate("common.delete")}
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDialog((d) => ({ ...d, open: false }))}
                  disabled={saving}
                >
                  {translate("common.cancel")}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving || !subjectId || !teacherId || !room.trim()}
                >
                  {saving ? translate("common.saving") : translate("common.save")}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
