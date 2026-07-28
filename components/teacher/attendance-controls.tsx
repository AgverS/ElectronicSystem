"use client";

import { useTransition, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";
import { formatCourse } from "@/lib/group-course";

const MONTH_NAMES = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

function monthLabel(month: string) {
  const [year, mon] = month.split("-").map(Number);
  return MONTH_NAMES[mon - 1] + " " + year;
}

function shiftMonth(month: string, delta: number) {
  const [year, mon] = month.split("-").map(Number);
  const d = new Date(year, mon - 1 + delta);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

function isValidMonth(v: string) {
  if (!/^\d{4}-\d{2}$/.test(v)) return false;
  const [y, m] = v.split("-").map(Number);
  return y >= 2000 && y <= 2100 && m >= 1 && m <= 12;
}

interface AttendanceControlsProps {
  groups: { id: string; name: string }[];
  groupId: string;
  month: string;
  showGroupSelect?: boolean;
}

export function AttendanceControls({
  groups,
  groupId,
  month,
  showGroupSelect = true,
}: AttendanceControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState(false);

  function navigate(g: string, m: string) {
    startTransition(() => {
      router.push(pathname + "?groupId=" + g + "&month=" + m);
    });
  }

  function startEdit() {
    setDraft(month);
    setError(false);
    setEditing(true);
  }

  function commitEdit() {
    const v = draft.trim();
    if (isValidMonth(v)) {
      setEditing(false);
      setError(false);
      if (v !== month) navigate(groupId, v);
    } else {
      setError(true);
    }
  }

  function cancelEdit() {
    setEditing(false);
    setError(false);
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-end gap-3",
        pending && "pointer-events-none opacity-50",
      )}
    >
      {showGroupSelect && (
        <div className="flex flex-col gap-1">
          <Label className="text-xs font-medium text-muted-foreground">
            Группа
          </Label>
          <SearchableSelect
            value={groupId}
            onValueChange={(v) => navigate(v, month)}
            options={groups.map((g) => ({
              value: g.id,
              label: `${g.name} (${formatCourse(g.name)})`,
            }))}
            placeholder="Выберите группу"
            searchPlaceholder="Поиск группы…"
            className="w-[180px]"
          />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <Label className="text-xs font-medium text-muted-foreground">
          Месяц
        </Label>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="outline"
            className="h-9 w-9 shrink-0"
            onClick={() => navigate(groupId, shiftMonth(month, -1))}
            aria-label="Предыдущий месяц"
          >
            <IconChevronLeft size={16} />
          </Button>

          {editing ? (
            <div className="flex flex-col gap-0.5">
              <input
                autoFocus
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setError(false);
                }}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitEdit();
                  }
                  if (e.key === "Escape") cancelEdit();
                }}
                placeholder="ГГГГ-ММ"
                className={cn(
                  "h-9 w-[118px] rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus:ring-3 focus:ring-ring/50 transition-[border-color,box-shadow]",
                  error
                    ? "border-destructive focus:border-destructive focus:ring-destructive/30"
                    : "border-input focus:border-ring",
                )}
              />
              {error && (
                <span className="text-[11px] leading-none text-destructive">
                  Формат: ГГГГ-ММ (например, 2025-09)
                </span>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={startEdit}
              title="Нажмите для ввода вручную"
              className="h-9 w-[118px] rounded-md border border-input bg-transparent px-3 text-sm text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {monthLabel(month)}
            </button>
          )}

          <Button
            size="icon"
            variant="outline"
            className="h-9 w-9 shrink-0"
            onClick={() => navigate(groupId, shiftMonth(month, +1))}
            aria-label="Следующий месяц"
          >
            <IconChevronRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
