"use client";

import { useState, useTransition } from "react";
import { translate } from "@/lib/i18n/translate";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconCalendarClock } from "@tabler/icons-react";
import { setLabDeadline } from "@/lib/actions/teacher";
import { labDeadline } from "@/lib/labs";
import { cn } from "@/lib/utils";
import { useRefresh } from "@/lib/use-refresh";

function fmtShort(d: Date) {
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

function toInputDate(d: Date) {
  return new Date(d).toISOString().split("T")[0];
}

interface LabHeaderProps {
  lessonId: string;
  assignmentId: string;
  date: Date;
  deadline: Date | null;
  readonly?: boolean;
}

export function LabHeader({
  lessonId,
  assignmentId,
  date,
  deadline,
  readonly,
}: LabHeaderProps) {
  const effective = labDeadline(date, deadline);
  const isOverdue = new Date() > effective;
  const isExtended = deadline != null;

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(toInputDate(effective));
  const [pending, startTransition] = useTransition();
  const refresh = useRefresh();

  function save(value: string | null) {
    startTransition(async () => {
      await setLabDeadline({ lessonId, assignmentId, deadline: value });
      refresh();
      setOpen(false);
    });
  }

  const label = (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[10px] tabular-nums",
        isOverdue
          ? "text-red-600 dark:text-red-400"
          : isExtended
            ? "text-amber-600 dark:text-amber-400"
            : "text-muted-foreground/60",
      )}
      title={translate("lab.deadlineTitle", { date: fmtShort(effective) })}
    >
      <IconCalendarClock size={10} className="shrink-0" />
      {translate("lab.dueBy", { date: fmtShort(effective) })}
    </span>
  );

  return (
    <div className={cn("flex flex-col items-center gap-0.5", pending && "opacity-50")}>
      <span className="text-xs font-medium tabular-nums">{fmtShort(date)}</span>
      {readonly ? (
        label
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              onClick={() => setDraft(toInputDate(effective))}
              className="cursor-pointer rounded px-0.5 hover:bg-muted"
            >
              {label}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3" align="center">
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium">{translate("ui.laboratoryDeadline2")}</p>
              <Input
                type="date"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="h-8 text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                {translate("lab.overdueExplain")}
              </p>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  className="h-7 flex-1 text-xs"
                  disabled={pending || !draft}
                  onClick={() => save(draft)}
                >
                  {translate("common.save")}
                </Button>
                {isExtended && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={pending}
                    onClick={() => save(null)}
                    title={translate("ui.restoreTheDefaultDeadline14Days")}
                  >
                    {translate("common.reset")}
                  </Button>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
