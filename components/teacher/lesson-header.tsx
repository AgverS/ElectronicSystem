"use client";

import { useTransition, useState, useEffect, useRef } from "react";
import { IconTrash } from "@tabler/icons-react";
import { deleteLesson } from "@/lib/actions/teacher";
import { cn } from "@/lib/utils";
import { useRefresh } from "@/lib/use-refresh";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LessonHeaderProps {
  lessonId: string;
  assignmentId: string;
  date: string;
  readonly?: boolean;
}

export function LessonHeader({ lessonId, assignmentId, date, readonly }: LessonHeaderProps) {
  const [pending, startTransition] = useTransition();
  const refresh = useRefresh();
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      timerRef.current = setTimeout(() => setConfirming(false), 3000);
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    setConfirming(false);
    startTransition(async () => {
      await deleteLesson(lessonId, assignmentId);
      refresh();
    });
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className={cn("group flex flex-col items-center gap-0.5", pending && "opacity-50")}>
      <span className="text-xs font-medium tabular-nums">{date}</span>
      {!readonly && (
        <TooltipProvider>
          <Tooltip open={confirming}>
            <TooltipTrigger asChild>
              <button
                onClick={handleDelete}
                disabled={pending}
                className={cn(
                  "opacity-0 group-hover:opacity-100 transition-opacity",
                  confirming
                    ? "opacity-100 text-destructive"
                    : "text-destructive/50 hover:text-destructive"
                )}
              >
                <IconTrash size={10} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Нажмите ещё раз для подтверждения
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
