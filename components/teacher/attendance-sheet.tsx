"use client";

import { useMemo, useState } from "react";
import { translate } from "@/lib/i18n/translate";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { setAbsenceExcused } from "@/lib/actions/teacher";
import { AttendanceControls } from "@/components/teacher/attendance-controls";
import { AttendanceExportButton } from "@/components/teacher/attendance-export-button";
import { AttendancePrintButton } from "@/components/teacher/attendance-print-button";

interface StudentRow {
  id: string;
  idx: number;
  name: string;
  perDay: number[]; // индексы 1..daysInMonth
}

interface AttendanceSheetProps {
  groups: { id: string; name: string }[];
  groupId: string;
  groupName: string;
  month: string;
  monthLabel: string;
  curatorName: string | null;
  daysInMonth: number;
  canEdit: boolean;
  /** Показывать ли выбор группы (только для админа/мастера). */
  showGroupSelect: boolean;
  students: StudentRow[];
  /** Ключи `${studentId}:${day}` уважительных дней. */
  initialExcused: string[];
}

const key = (studentId: string, day: number) => `${studentId}:${day}`;

// «Абаши Алексей Валерьевич» → «Абаши А. В.»
function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  const [surname, ...rest] = parts;
  return surname + " " + rest.map((p) => p.charAt(0).toUpperCase() + ".").join(" ");
}

export function AttendanceSheet({
  groups,
  groupId,
  groupName,
  month,
  monthLabel,
  curatorName,
  daysInMonth,
  canEdit,
  showGroupSelect,
  students,
  initialExcused,
}: AttendanceSheetProps) {
  const [excused, setExcused] = useState<Set<string>>(
    () => new Set(initialExcused),
  );
  const [pending, setPending] = useState<Set<string>>(() => new Set());

  const days = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => i + 1),
    [daysInMonth],
  );

  // Итоги по студенту: всего / уважительные / неуважительные.
  const rows = useMemo(
    () =>
      students.map((s) => {
        let total = 0;
        let exc = 0;
        for (const d of days) {
          const v = s.perDay[d] || 0;
          total += v;
          if (v && excused.has(key(s.id, d))) exc += v;
        }
        return { ...s, total, excused: exc, unexcused: total - exc };
      }),
    [students, days, excused],
  );

  const dayTotals = useMemo(() => {
    const arr = new Array(daysInMonth + 1).fill(0);
    for (const d of days) for (const s of students) arr[d] += s.perDay[d] || 0;
    return arr;
  }, [students, days, daysInMonth]);

  const grand = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          total: acc.total + r.total,
          excused: acc.excused + r.excused,
          unexcused: acc.unexcused + r.unexcused,
        }),
        { total: 0, excused: 0, unexcused: 0 },
      ),
    [rows],
  );

  async function toggle(studentId: string, day: number) {
    if (!canEdit) return;
    const k = key(studentId, day);
    if (pending.has(k)) return;
    const willExcuse = !excused.has(k);

    // Оптимистично обновляем, при ошибке откатываем.
    setExcused((prev) => {
      const next = new Set(prev);
      if (willExcuse) next.add(k);
      else next.delete(k);
      return next;
    });
    setPending((prev) => new Set(prev).add(k));

    const date = `${month}-${String(day).padStart(2, "0")}`;
    try {
      await setAbsenceExcused({
        studentId,
        date,
        excused: willExcuse,
        groupId,
      });
    } catch (e) {
      setExcused((prev) => {
        const next = new Set(prev);
        if (willExcuse) next.delete(k);
        else next.add(k);
        return next;
      });
      toast.error(e instanceof Error ? e.message : translate("ui.couldNotSave"));
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(k);
        return next;
      });
    }
  }

  // Данные для экспорта в Excel.
  const csvHeader: (string | number)[] = [
    "№",
    translate("ui.fullName"),
    ...days,
    translate("common.total"),
    translate("ui.excused2"),
    translate("ui.unexcused2"),
  ];
  const csvRows: (string | number)[][] = rows.map((r) => [
    r.idx,
    r.name,
    ...days.map((d) => r.perDay[d] || ""),
    r.total,
    r.excused || "",
    r.unexcused || "",
  ]);
  csvRows.push([
    "",
    translate("ui.total"),
    ...days.map((d) => dayTotals[d] || ""),
    grand.total,
    grand.excused,
    grand.unexcused,
  ]);
  const safeName = groupName.replace(/[^0-9A-Za-zА-Яа-я]+/g, "_");
  const fileName = translate("ui.absenceReport") + safeName + "_" + month + ".xlsx";
  const exportTitle = translate("ui.absenceReport2") + groupName + " · " + monthLabel;

  const thDay =
    "border-b-2 border-r px-1 py-2 text-center text-[11px] font-medium text-muted-foreground";
  const tdDay = "border-b border-r px-1 py-1 text-center tabular-nums";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{translate("nav.attendanceReport")}</h1>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            Группа {groupName} · {monthLabel}
          </p>
        </div>
        <div className="no-print flex flex-wrap items-end gap-2">
          <AttendanceControls
            groups={groups}
            groupId={groupId}
            month={month}
            showGroupSelect={showGroupSelect}
          />
          <AttendanceExportButton
            fileName={fileName}
            title={exportTitle}
            header={csvHeader}
            rows={csvRows}
            disabled={rows.length === 0}
          />
          <AttendancePrintButton />
        </div>
      </div>

      <p className="no-print text-xs text-muted-foreground">
        В ячейке — количество пропущенных уроков (Н) за день по всем предметам.
        {" "}
        <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-[1.5px] border-current px-0.5 align-text-bottom text-[11px] font-semibold leading-none text-green-700 dark:text-green-400">
          Н
        </span>{" "}
        в кружке — пропуск по{" "}
        <span className="font-medium">{translate("ui.excused")}</span> причине, без кружка —{" "}
        <span className="font-medium">{translate("ui.unexcused")}</span>.
        {canEdit
          ? translate("ui.clickACellToToggleItTotalsRecalculate")
          : translate("ui.onlyTheGroupSCuratorCanMarkAn")}
      </p>

      <div className="attendance-overflow overflow-auto rounded-lg border">
        <table className="attendance-table border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 w-10 min-w-10 border-b-2 border-r bg-muted px-2 py-2 text-center font-semibold">
                №
              </th>
              <th className="sticky left-10 z-20 min-w-[180px] border-b-2 border-r bg-muted px-3 py-2 text-left font-semibold">
                {translate("ui.studentSFullName")}
              </th>
              {days.map((d) => (
                <th key={d} className={cn(thDay, "min-w-[26px]")}>
                  {d}
                </th>
              ))}
              <th className="min-w-[44px] border-b-2 border-l-2 bg-muted px-2 py-2 text-center font-semibold">
                {translate("common.total")}
              </th>
              <th className="min-w-[44px] border-b-2 border-r bg-muted px-2 py-2 text-center font-semibold text-green-700 dark:text-green-400">
                {translate("ui.excused2")}
              </th>
              <th className="min-w-[44px] border-b-2 bg-muted px-2 py-2 text-center font-semibold text-red-700 dark:text-red-400">
                {translate("ui.unexcused2")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={daysInMonth + 5}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  {translate("ui.thisGroupHasNoStudents")}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-muted/30">
                <td className="sticky left-0 z-10 w-10 min-w-10 border-b border-r bg-background px-2 py-1 text-center text-muted-foreground">
                  {r.idx}
                </td>
                <td className="sticky left-10 z-10 border-b border-r bg-background px-3 py-1 font-medium whitespace-nowrap">
                  <span className="sm:hidden print:hidden">{shortName(r.name)}</span>
                  <span className="hidden sm:inline print:inline">{r.name}</span>
                </td>
                {days.map((d) => {
                  const v = r.perDay[d];
                  const k = key(r.id, d);
                  const isExcused = v > 0 && excused.has(k);
                  const isPending = pending.has(k);
                  const interactive = v > 0 && canEdit;
                  return (
                    <td
                      key={d}
                      onClick={interactive ? () => toggle(r.id, d) : undefined}
                      title={
                        v > 0
                          ? isExcused
                            ? translate("audit.entity.excused_absence") +
                            (canEdit ? " — нажмите, чтобы снять" : "")
                            : translate("ui.unexcusedAbsence") +
                            (canEdit ? " — нажмите, чтобы отметить уважительным" : "")
                          : undefined
                      }
                      className={cn(
                        tdDay,
                        v
                          ? isExcused
                            ? "font-semibold text-green-700 dark:text-green-400"
                            : "font-semibold text-red-600 dark:text-red-400"
                          : "text-muted-foreground/20",
                        interactive && "cursor-pointer hover:bg-muted/60",
                        isPending && "opacity-40",
                      )}
                    >
                      {v ? (
                        isExcused ? (
                          <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-[1.5px] border-current px-0.5 leading-none">
                            {v}
                          </span>
                        ) : (
                          v
                        )
                      ) : (
                        ""
                      )}
                    </td>
                  );
                })}
                <td className="border-b border-l-2 px-2 py-1 text-center font-bold tabular-nums">
                  {r.total}
                </td>
                <td className="border-b border-r px-2 py-1 text-center font-semibold tabular-nums text-green-600 dark:text-green-400">
                  {r.excused || ""}
                </td>
                <td className="border-b px-2 py-1 text-center font-semibold tabular-nums text-red-600 dark:text-red-400">
                  {r.unexcused || ""}
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-muted font-semibold">
                <td className="sticky left-0 z-10 border-t-2 border-r bg-muted px-2 py-1.5" />
                <td className="sticky left-10 z-10 border-t-2 border-r bg-muted px-3 py-1.5 text-right text-[11px] uppercase tracking-wide">
                  {translate("ui.dayTotal")}
                </td>
                {days.map((d) => (
                  <td
                    key={d}
                    className="border-t-2 border-r px-1 py-1.5 text-center tabular-nums text-orange-600 dark:text-orange-400"
                  >
                    {dayTotals[d] || ""}
                  </td>
                ))}
                <td className="border-t-2 border-l-2 px-2 py-1.5 text-center tabular-nums">
                  {grand.total}
                </td>
                <td className="border-t-2 border-r px-2 py-1.5 text-center tabular-nums text-green-600 dark:text-green-400">
                  {grand.excused}
                </td>
                <td className="border-t-2 px-2 py-1.5 text-center tabular-nums text-red-600 dark:text-red-400">
                  {grand.unexcused}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Signature block — print only */}
      <div className="hidden print:block mt-10 text-sm">
        <div className="flex items-end gap-2 flex-wrap">
          <span className="whitespace-nowrap">Куратор группы {groupName}:</span>
          <span className="flex-none inline-block w-36 border-b border-black" />
          <span>/</span>
          <span className="flex-none inline-block w-48 border-b border-black text-center text-xs leading-none pb-0.5">
            {curatorName ?? ""}
          </span>
          <span>/</span>
          <span className="ml-8 whitespace-nowrap">{translate("ui.date")}</span>
          <span className="flex-none inline-block w-28 border-b border-black" />
        </div>
        <div className="flex gap-2 mt-0.5 text-[10px] text-gray-500">
          <span className="w-fit whitespace-nowrap opacity-0">
            Куратор группы {groupName}:
          </span>
          <span className="w-36 text-center">{translate("ui.signature")}</span>
          <span className="w-2" />
          <span className="w-48 text-center">{translate("ui.fullName3")}</span>
        </div>
      </div>
    </div>
  );
}
