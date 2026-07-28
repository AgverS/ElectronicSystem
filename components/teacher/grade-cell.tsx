"use client";

import { useTransition, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { saveGrade, addRetake } from "@/lib/actions/teacher";
import { cn } from "@/lib/utils";
import { useRefresh } from "@/lib/use-refresh";

// With hover — for popover buttons
const GRADE_BG: Record<string, string> = {
  "1": "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-950",
  "2": "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-950",
  "3": "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/60 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-950",
  "4": "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/60 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-950",
  "5": "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/60 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-950",
  "6": "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/60 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-950",
  "7": "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-950",
  "8": "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-950",
  "9": "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-950",
  "10": "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-950",
  Н: "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-950",
};

// Without hover — for display badges
const GRADE_COLOR: Record<string, string> = {
  "1": "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300",
  "2": "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300",
  "3": "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/60 dark:text-yellow-300",
  "4": "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/60 dark:text-yellow-300",
  "5": "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/60 dark:text-yellow-300",
  "6": "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/60 dark:text-yellow-300",
  "7": "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300",
  "8": "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300",
  "9": "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
  "10": "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
  Н: "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300",
};

const RED_COLOR =
  "bg-red-500 text-white dark:bg-red-600 dark:text-white ring-2 ring-red-300 dark:ring-red-900";
const RED_STYLE =
  "bg-red-500 text-white dark:bg-red-600 dark:text-white hover:bg-red-600 dark:hover:bg-red-500 ring-2 ring-red-300 dark:ring-red-900";

export interface GradeEntry {
  id: string;
  value: string;
  retakeNumber: number;
}

interface GradeCellProps {
  lessonId: string;
  studentId: string;
  assignmentId: string;
  grades: GradeEntry[];
  readonly?: boolean;
  lessonType?: string;
}

function isRedGrade(value: string, lessonType: string) {
  const isN = value === "Н";
  const numVal = parseInt(value);
  return (
    (lessonType === "практика" && isN) ||
    ((lessonType === "лабораторная" || lessonType === "ОКР") &&
      (isN || (!isNaN(numVal) && numVal < 3)))
  );
}

function gradeColor(value: string, lessonType: string) {
  if (!value) return "";
  return isRedGrade(value, lessonType) ? RED_COLOR : (GRADE_COLOR[value] ?? "");
}

function gradeButtonStyle(value: string, lessonType: string) {
  if (!value) return "";
  return isRedGrade(value, lessonType) ? RED_STYLE : (GRADE_BG[value] ?? "");
}

export function GradeCell({
  lessonId,
  studentId,
  assignmentId,
  grades: initialGrades,
  readonly,
  lessonType = "лекция",
}: GradeCellProps) {
  const [grades, setGrades] = useState<GradeEntry[]>(
    [...initialGrades].sort((a, b) => a.retakeNumber - b.retakeNumber),
  );
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const refresh = useRefresh();

  const lastGrade = grades.length > 0 ? grades[grades.length - 1] : null;
  const activeValue = lastGrade?.value ?? "";
  const activeRetakeNumber = lastGrade?.retakeNumber ?? 0;
  const hasRetakes = grades.length > 1;

  function persist(nextValue: string) {
    const retakeNum = activeRetakeNumber;
    setGrades((prev) => {
      if (nextValue === "") {
        if (retakeNum === 0) return [];
        return prev.filter((g) => g.retakeNumber < retakeNum);
      }
      const idx = prev.findIndex((g) => g.retakeNumber === retakeNum);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], value: nextValue };
        return updated;
      }
      return [
        ...prev,
        { id: "opt", value: nextValue, retakeNumber: retakeNum },
      ];
    });
    setOpen(false);
    startTransition(async () => {
      await saveGrade({
        lessonId,
        studentId,
        assignmentId,
        value: nextValue,
        retakeNumber: retakeNum,
      });
      refresh();
    });
  }

  function handleSelect(option: string) {
    persist(option === activeValue ? "" : option);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const keyMap: Record<string, string> = {
      "1": "1",
      "2": "2",
      "3": "3",
      "4": "4",
      "5": "5",
      "6": "6",
      "7": "7",
      "8": "8",
      "9": "9",
      "0": "10",
      н: "Н",
      h: "Н",
      n: "Н",
    };
    const target = keyMap[e.key.toLowerCase()];
    if (target) {
      e.preventDefault();
      persist(target === activeValue ? "" : target);
      return;
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      persist("");
    }
  }

  function handleAddRetake() {
    startTransition(async () => {
      const newNum = await addRetake({ lessonId, studentId, assignmentId });
      setGrades((prev) => [
        ...prev,
        { id: "new-" + newNum, value: "", retakeNumber: newNum },
      ]);
      refresh();
    });
  }

  const canAddRetake = grades.length > 0 && grades.length < 4;

  // ── Readonly ──────────────────────────────────────────────────────────────
  if (readonly) {
    if (grades.length === 0) {
      return (
        <div className="inline-flex h-7 min-w-7 items-center justify-center text-xs text-muted-foreground/30">
          -
        </div>
      );
    }
    if (!hasRetakes) {
      const v = grades[0].value;
      return (
        <div
          className={cn(
            "inline-flex h-7 min-w-7 items-center justify-center rounded text-xs font-semibold",
            v ? gradeColor(v, lessonType) : "text-muted-foreground/30",
          )}
        >
          {v || "-"}
        </div>
      );
    }
    return <SplitBadge grades={grades} lessonType={lessonType} />;
  }

  // ── Popover content ───────────────────────────────────────────────────────
  const popoverContent = (
    <PopoverContent
      className="w-auto p-2"
      align="center"
      onKeyDown={handleKeyDown}
    >
      <div className="flex flex-col gap-2">
        {/* Grade label for retake context */}
        {hasRetakes && (
          <p className="text-[10px] font-medium text-muted-foreground">
            Пересдача {grades.length - 1}
          </p>
        )}

        <div className="grid grid-cols-5 gap-1">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"].map((g) => (
            <button
              key={g}
              onClick={() => handleSelect(g)}
              className={cn(
                "h-8 w-9 rounded text-sm font-semibold transition-all hover:scale-110",
                GRADE_BG[g],
                activeValue === g && "ring-2 ring-ring ring-offset-1",
              )}
            >
              {g}
            </button>
          ))}
        </div>

        <div className="flex gap-1">
          <button
            onClick={() => handleSelect("Н")}
            className={cn(
              "h-8 flex-1 rounded text-sm font-semibold transition-all hover:scale-105",
              GRADE_BG["Н"],
              activeValue === "Н" && "ring-2 ring-ring ring-offset-1",
            )}
          >
            Н
          </button>
          <button
            onClick={() => persist("")}
            className={cn(
              "h-8 flex-1 rounded text-sm transition-colors",
              activeValue === ""
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {activeRetakeNumber > 0 ? "Удалить" : "Нет"}
          </button>
        </div>

        {/* Retakes section */}
        {grades.length > 0 && (
          <div className="border-t pt-2 flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Пересдачи
            </p>

            {grades.length > 1 && (
              <div className="flex flex-col gap-1">
                {grades.map((g, i) => (
                  <div key={g.retakeNumber} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-20 shrink-0">
                      {i === 0 ? "Оригинал" : `Пересдача ${i}`}
                    </span>
                    <span
                      className={cn(
                        "inline-flex h-5 min-w-[22px] items-center justify-center rounded px-1 text-[10px] font-semibold",
                        g.value
                          ? cn(
                              gradeColor(g.value, lessonType),
                              i < grades.length - 1 && "opacity-60",
                            )
                          : "text-muted-foreground/40",
                      )}
                    >
                      {g.value || "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {canAddRetake ? (
              <button
                onClick={handleAddRetake}
                disabled={pending}
                className="mt-0.5 text-left text-xs text-primary hover:underline disabled:opacity-40"
              >
                + Добавить пересдачу
              </button>
            ) : grades.length >= 4 ? (
              <p className="text-[10px] text-muted-foreground italic">
                Максимум пересдач достигнут
              </p>
            ) : null}
          </div>
        )}
      </div>
    </PopoverContent>
  );

  // ── Split cell (retakes exist) ─────────────────────────────────────────────
  if (hasRetakes) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "cursor-pointer rounded focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
              "transition-opacity hover:opacity-80",
              pending && "opacity-40",
            )}
          >
            <SplitBadge grades={grades} lessonType={lessonType} />
          </button>
        </PopoverTrigger>
        {popoverContent}
      </Popover>
    );
  }

  // ── Single grade (standard) ───────────────────────────────────────────────
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex h-7 min-w-7 cursor-pointer items-center justify-center rounded text-xs font-semibold",
            "transition-all hover:ring-2 hover:ring-ring hover:ring-offset-1",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
            pending && "opacity-50",
            activeValue
              ? gradeButtonStyle(activeValue, lessonType)
              : "text-muted-foreground/30 hover:bg-muted hover:text-foreground",
          )}
        >
          {activeValue || "·"}
        </button>
      </PopoverTrigger>
      {popoverContent}
    </Popover>
  );
}

// ── SplitBadge ────────────────────────────────────────────────────────────────
// Bordered card with all grades stacked at equal size.
// Previous grades have a diagonal SVG line at opacity-50; last is plain.
function SplitBadge({
  grades,
  lessonType,
}: {
  grades: GradeEntry[];
  lessonType: string;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-md border border-border/60 shadow-sm min-w-[28px]">
      {grades.map((g, i) => {
        const isLast = i === grades.length - 1;
        const color = g.value ? gradeColor(g.value, lessonType) : "";

        return (
          <div
            key={g.retakeNumber}
            className={cn(
              "relative flex items-center justify-center px-1.5 py-1",
              "text-xs font-semibold",
              !isLast && "border-b border-border/40",
              color ||
                (isLast
                  ? "text-muted-foreground/40"
                  : "text-muted-foreground/30"),
            )}
          >
            {g.value || "·"}
            {!isLast && (
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full opacity-80"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <line
                  x1="100"
                  y1="0"
                  x2="0"
                  y2="100"
                  stroke="currentColor"
                  strokeWidth="3"
                />
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
}
