"use client";

import { useState } from "react";
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
import { upsertSubstitution, deleteSubstitution } from "@/lib/actions/schedule";
import {
  getMonday,
  getWeekDates,
  toISODate,
  fmtShort,
  fromISODate,
} from "@/lib/week";
import {
  IconChevronLeft,
  IconChevronRight,
  IconPencil,
  IconPlus,
} from "@tabler/icons-react";

type BaseEntry = {
  id: string;
  dayOfWeek: number;
  lessonNumber: number;
  subgroup: string;
  room: string;
  subject: { id: string; name: string };
  teacher: { id: string; name: string };
};

type SubEntry = {
  id: string;
  groupId: string;
  date: string;
  lessonNumber: number;
  subgroup: string;
  cancelled: boolean;
  room: string | null;
  subject: { id: string; name: string } | null;
  teacher: { id: string; name: string } | null;
};

type Subject = { id: string; name: string };
type Teacher = { id: string; name: string };
type Assignment = { teacherId: string; subjectId: string };

const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const LESSONS = Array.from({ length: 13 }, (_, i) => i + 1);

interface DialogState {
  open: boolean;
  date: string;
  lessonNumber: number;
  base?: BaseEntry;
  sub?: SubEntry;
}

interface Props {
  groupId: string;
}

export function SubstitutionGrid({ groupId }: Props) {
  const today = new Date();
  const [monday, setMonday] = useState<Date>(() => getMonday(today));
  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    date: toISODate(today),
    lessonNumber: 1,
  });
  const [cancelled, setCancelled] = useState(false);
  const [subjectId, setSubjectId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [room, setRoom] = useState("");
  const [subgroup, setSubgroup] = useState("");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const weekDates = getWeekDates(monday);
  const weekStart = toISODate(monday);

  const { data: baseEntries = [] } = useQuery<BaseEntry[]>({
    queryKey: ["schedule", groupId],
    queryFn: async () =>
      groupId ? (await fetch(`/api/schedule?groupId=${groupId}`)).json() : [],
    enabled: !!groupId,
  });

  const { data: subs = [] } = useQuery<SubEntry[]>({
    queryKey: ["substitutions", groupId, weekStart],
    queryFn: async () =>
      (
        await fetch(
          `/api/substitutions?groupId=${groupId}&weekStart=${weekStart}`,
        )
      ).json(),
    enabled: !!groupId,
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

  // Multiple base entries per slot (one per subgroup)
  const baseMap = new Map<string, BaseEntry[]>();
  for (const e of baseEntries) {
    const key = `${e.dayOfWeek}-${e.lessonNumber}`;
    const arr = baseMap.get(key) ?? [];
    arr.push(e);
    baseMap.set(key, arr);
  }

  // Multiple substitutions per slot (one per subgroup)
  const subMap = new Map<string, SubEntry[]>();
  for (const s of subs) {
    const key = `${s.date}-${s.lessonNumber}`;
    const arr = subMap.get(key) ?? [];
    arr.push(s);
    subMap.set(key, arr);
  }

  function prevWeek() {
    const d = new Date(monday);
    d.setUTCDate(d.getUTCDate() - 7);
    setMonday(d);
  }

  function nextWeek() {
    const d = new Date(monday);
    d.setUTCDate(d.getUTCDate() + 7);
    setMonday(d);
  }

  function goToday() {
    setMonday(getMonday(new Date()));
  }

  function openDialog(
    date: string,
    lessonNumber: number,
    base?: BaseEntry,
    sub?: SubEntry,
    defaultSubgroup?: string,
  ) {
    setDialog({ open: true, date, lessonNumber, base, sub });
    setCancelled(sub?.cancelled ?? false);
    setSubjectId(sub?.subject?.id ?? base?.subject?.id ?? "");
    setTeacherId(sub?.teacher?.id ?? base?.teacher?.id ?? "");
    setRoom(sub?.room ?? base?.room ?? "");
    setSubgroup(sub?.subgroup ?? base?.subgroup ?? defaultSubgroup ?? "");
  }

  async function handleSave() {
    setSaving(true);
    try {
      await upsertSubstitution({
        groupId,
        date: dialog.date,
        lessonNumber: dialog.lessonNumber,
        subgroup: subgroup.trim(),
        cancelled,
        subjectId: cancelled ? undefined : subjectId || undefined,
        teacherId: cancelled ? undefined : teacherId || undefined,
        room: cancelled ? undefined : room.trim() || undefined,
      });
      queryClient.invalidateQueries({
        queryKey: ["substitutions", groupId, weekStart],
      });
      setDialog((d) => ({ ...d, open: false }));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!dialog.sub) return;
    setSaving(true);
    try {
      await deleteSubstitution(dialog.sub.id);
      queryClient.invalidateQueries({
        queryKey: ["substitutions", groupId, weekStart],
      });
      setDialog((d) => ({ ...d, open: false }));
    } finally {
      setSaving(false);
    }
  }

  const subjectList: Subject[] = subjects?.data ?? [];
  const teacherList: Teacher[] = teachersRes?.data ?? [];

  const satStr = toISODate(weekDates[5]);
  const weekLabel = `${fmtShort(monday)} – ${fmtShort(fromISODate(satStr))}`;

  const dialogDate = dialog.date ? fromISODate(dialog.date) : new Date();
  const dialogDayName =
    DAY_NAMES[dialogDate.getUTCDay() === 0 ? 6 : dialogDate.getUTCDay() - 1] ??
    "";

  function subgroupTag(sg: string) {
    return sg ? (
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Подгр. {sg}
      </span>
    ) : null;
  }

  return (
    <>
      {/* Week navigation */}
      <div className="mb-4 flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={prevWeek}>
          <IconChevronLeft size={16} />
        </Button>
        <span className="min-w-32 text-center text-sm font-medium">
          {weekLabel}
        </span>
        <Button variant="outline" size="sm" onClick={nextWeek}>
          <IconChevronRight size={16} />
        </Button>

        {weekStart !== toISODate(getMonday(new Date())) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={goToday}
            className="text-muted-foreground"
          >
            Перейти к текущей неделе
          </Button>
        )}
      </div>

      <div className="overflow-auto rounded-lg border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="border-r px-3 py-2 text-center font-medium text-muted-foreground w-10">
                №
              </th>
              {weekDates.map((date, i) => (
                <th
                  key={i}
                  className="px-3 py-2 text-center font-medium min-w-44"
                >
                  <div>{DAY_NAMES[i]}</div>
                  <div className="text-xs font-normal text-muted-foreground">
                    {fmtShort(date)}
                  </div>
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
                {weekDates.map((date, i) => {
                  const dateStr = toISODate(date);
                  const dow = i + 1;
                  const baseList = baseMap.get(`${dow}-${lessonNum}`) ?? [];
                  const subList = subMap.get(`${dateStr}-${lessonNum}`) ?? [];

                  // Union of subgroups present in base schedule or substitutions
                  const subgroups = Array.from(
                    new Set([
                      ...baseList.map((b) => b.subgroup),
                      ...subList.map((s) => s.subgroup),
                    ]),
                  ).sort();

                  return (
                    <td key={i} className="px-2 py-1.5 align-top">
                      <div className="flex flex-col gap-1">
                        {subgroups.map((sg, idx) => {
                          const base = baseList.find((b) => b.subgroup === sg);
                          const sub = subList.find((s) => s.subgroup === sg);
                          const divider = idx > 0 && (
                            <div className="mb-1 border-t border-dashed border-border/60" />
                          );

                          if (sub) {
                            return (
                              <div key={`s-${sg}`}>
                                {divider}
                                <button
                                  onClick={() =>
                                    openDialog(dateStr, lessonNum, base, sub)
                                  }
                                  className={
                                    sub.cancelled
                                      ? "w-full rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-left text-xs hover:brightness-95 transition-all dark:border-red-900 dark:bg-red-950/30"
                                      : "w-full rounded-md border border-yellow-200 bg-yellow-50 px-2 py-1.5 text-left text-xs hover:brightness-95 transition-all dark:border-yellow-800 dark:bg-yellow-950/30"
                                  }
                                >
                                  {sub.cancelled ? (
                                    <div className="relative pt-4">
                                      <span className="absolute right-0 top-0 rounded-bl bg-red-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                                        Отменено
                                      </span>
                                      {subgroupTag(sg)}
                                      {base && (
                                        <div className="text-muted-foreground line-through">
                                          {base.subject.name}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="relative pt-4">
                                      <span className="absolute right-0 top-0 rounded-bl bg-yellow-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                                        Замена
                                      </span>
                                      {subgroupTag(sg)}
                                      <div className="font-medium text-foreground truncate">
                                        {sub.subject?.name ?? "-"}
                                      </div>
                                      <div className="text-muted-foreground truncate">
                                        {sub.teacher?.name ?? "-"}
                                      </div>
                                      {sub.room && (
                                        <div className="text-muted-foreground">
                                          Каб. {sub.room}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </button>
                              </div>
                            );
                          }

                          // base only - clicking creates a substitution for it
                          return (
                            <div key={`b-${sg}`}>
                              {divider}
                              <button
                                onClick={() =>
                                  openDialog(dateStr, lessonNum, base)
                                }
                                className="w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted transition-colors group flex items-start gap-1"
                              >
                                <div className="flex-1 min-w-0">
                                  {subgroupTag(sg)}
                                  <div className="font-medium text-foreground truncate">
                                    {base?.subject.name}
                                  </div>
                                  <div className="text-muted-foreground truncate">
                                    {base?.teacher.name}
                                  </div>
                                  <div className="text-muted-foreground">
                                    Каб. {base?.room}
                                  </div>
                                </div>
                                <IconPencil
                                  size={12}
                                  className="mt-0.5 shrink-0 opacity-0 group-hover:opacity-50"
                                />
                              </button>
                            </div>
                          );
                        })}

                        <button
                          onClick={() => {
                            const nextSubgroup =
                              subgroups.length === 0
                                ? ""
                                : String(subgroups.length + 1);
                            openDialog(
                              dateStr,
                              lessonNum,
                              undefined,
                              undefined,
                              nextSubgroup,
                            );
                          }}
                          className={
                            "w-full rounded-md flex items-center justify-center text-muted-foreground/30 hover:text-muted-foreground hover:bg-muted transition-colors " +
                            (subgroups.length === 0 ? "min-h-8" : "h-6 mt-0.5")
                          }
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

      <Dialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Замена - урок {dialog.lessonNumber} · {dialogDayName}{" "}
              {fmtShort(dialogDate)}
            </DialogTitle>
          </DialogHeader>

          {dialog.base && (
            <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              <span className="font-medium">По расписанию:</span>{" "}
              {dialog.base.subgroup ? `подгр. ${dialog.base.subgroup} · ` : ""}
              {dialog.base.subject.name} · {dialog.base.teacher.name} · Каб.{" "}
              {dialog.base.room}
            </div>
          )}

          <div className="flex flex-col gap-4">
            <Label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={cancelled}
                onChange={(e) => setCancelled(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Урок отменён</span>
            </Label>

            {!cancelled && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label required={!cancelled}>Предмет</Label>
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
                    placeholder="Выберите предмет"
                    className="w-full"
                    portalled={false}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label required={!cancelled}>Преподаватель</Label>
                  <SearchableSelect
                    value={teacherId}
                    onValueChange={setTeacherId}
                    options={teacherList.map((t) => ({
                      value: t.id,
                      label: t.name,
                    }))}
                    placeholder="Выберите преподавателя"
                    className="w-full"
                    portalled={false}
                  />
                </div>

                <div className="flex gap-3">
                  <div className="flex flex-col gap-1.5 flex-1">
                    <Label required={!cancelled}>Кабинет</Label>
                    <Input
                      value={room}
                      onChange={(e) => setRoom(e.target.value)}
                      placeholder="Например: 301"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 w-28">
                    <Label>Подгруппа</Label>
                    <Input
                      value={subgroup}
                      onChange={(e) => setSubgroup(e.target.value)}
                      placeholder="1, 2, …"
                      disabled={!!dialog.sub || !!dialog.base}
                    />
                  </div>
                </div>
              </>
            )}

            {cancelled && dialog.base?.subgroup && (
              <p className="text-xs text-muted-foreground">
                Отменяется только подгруппа {dialog.base.subgroup}.
              </p>
            )}

            <div className="flex items-center justify-between gap-2 pt-2">
              {dialog.sub ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  Удалить замену
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
                  Отмена
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={
                    saving ||
                    (!cancelled && (!subjectId || !teacherId || !room.trim()))
                  }
                >
                  {saving ? "Сохранение…" : "Сохранить"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
