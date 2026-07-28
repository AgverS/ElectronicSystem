"use client";

import { useTransition, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { saveLateness } from "@/lib/actions/teacher";
import { cn } from "@/lib/utils";
import { useRefresh } from "@/lib/use-refresh";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LatenessCellProps {
  lessonId: string;
  studentId: string;
  assignmentId: string;
  initialValue: number | null;
  readonly?: boolean;
  isAbsent?: boolean;
}

export function LatenessCell({
  lessonId,
  studentId,
  assignmentId,
  initialValue,
  readonly,
  isAbsent,
}: LatenessCellProps) {
  const [value, setValue] = useState<number | null>(initialValue);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const refresh = useRefresh();

  function persist(next: number | null) {
    if (next !== null) {
      if (next < 0) next = 0;
      if (next > 45) next = 45;
    }
    setValue(next);
    setOpen(false);
    startTransition(async () => {
      await saveLateness({ lessonId, studentId, assignmentId, lateness: next });
      refresh();
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      const val = parseInt(e.currentTarget.value);
      persist(isNaN(val) ? null : val);
    }
  }

  const baseStyle =
    value !== null
      ? value > 23
        ? "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300"
        : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
      : isAbsent
        ? "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300"
        : "text-muted-foreground/30";

  if (readonly) {
    return (
      <div
        className={cn(
          "inline-flex h-7 min-w-7 items-center justify-center rounded text-xs font-semibold",
          baseStyle,
        )}
      >
        {value !== null ? value : isAbsent ? "Н" : "-"}
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex h-7 min-w-7 cursor-pointer items-center justify-center rounded text-xs font-semibold",
            "transition-all hover:ring-2 hover:ring-ring hover:ring-offset-1",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
            pending && "opacity-50",
            value !== null || isAbsent
              ? baseStyle
              : "text-muted-foreground/30 hover:bg-muted hover:text-foreground",
          )}
        >
          {value !== null ? value : isAbsent ? "Н" : "·"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-3" align="center">
        <div className="flex flex-col gap-2">
          <Label className="text-xs font-medium text-muted-foreground">
            Минуты (0-45)
          </Label>
          <div className="flex gap-2">
            <Input
              type="number"
              min={0}
              max={45}
              defaultValue={value ?? ""}
              onKeyDown={handleKeyDown}
              autoFocus
              className="h-8"
            />
            <button
              onClick={() => persist(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Сброс
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground italic">
            {">"}23 мин = автоматически «Н»
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
