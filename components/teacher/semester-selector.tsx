"use client";

import { useTransition } from "react";
import { translate } from "@/lib/i18n/translate";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatSemesterName } from "@/lib/utils";

interface SemesterSelectorProps {
  semesters: { id: string; name: string; year: string }[];
  currentId: string;
  /** Семестр, который сейчас идёт по календарю — помечается «(текущий)». */
  markCurrentId?: string;
  groupName?: string;
}

export function SemesterSelector({
  semesters,
  currentId,
  markCurrentId,
  groupName,
}: SemesterSelectorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleChange(id: string) {
    startTransition(() => {
      router.push("?semester=" + id);
    });
  }

  if (semesters.length <= 1) {
    return null;
  }

  return (
    <div className={pending ? "opacity-50 pointer-events-none" : ""}>
      <Select value={currentId} onValueChange={handleChange}>
        <SelectTrigger className="h-8 w-[240px] text-xs">
          <SelectValue placeholder={translate("ui.selectASemester")} />
        </SelectTrigger>
        <SelectContent>
          {semesters.map((s) => (
            <SelectItem key={s.id} value={s.id} className="text-xs">
              {formatSemesterName(s, groupName)}
              {s.id === markCurrentId && (
                <span className="ml-1 text-muted-foreground">{translate("ui.current2")}</span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}