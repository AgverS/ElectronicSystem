"use client";

import { IconCheck } from "@tabler/icons-react";
import { translate } from "@/lib/i18n/translate";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Specialty {
  id: string;
  name: string;
  abbreviation: string;
}

interface Props {
  specialties: Specialty[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll?: (ids: string[]) => void;
}

export function SpecialtyMultiSelect({
  specialties,
  selected,
  onToggle,
  onToggleAll,
}: Props) {
  const allSelected = specialties.length > 0 && selected.size === specialties.length;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label>
          Специальности
          {selected.size > 0 && (
            <span className="ml-1.5 text-muted-foreground">{translate("ui.selectedInline", { count: selected.size })}</span>
          )}
        </Label>
        {onToggleAll && specialties.length > 0 && (
          <button
            type="button"
            onClick={() =>
              onToggleAll(allSelected ? [] : specialties.map((s) => s.id))
            }
            className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            <span
              className={cn(
                "flex size-3.5 shrink-0 items-center justify-center rounded border transition-colors",
                allSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input",
              )}
            >
              {allSelected && <IconCheck size={10} stroke={3} />}
            </span>
            <span>{translate("ui.selectAll")}</span>
          </button>
        )}
      </div>
      {specialties.length === 0 ? (
        <p className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
          {translate("ui.addSomeSpecialtiesFirst")}
        </p>
      ) : (
        <div className="flex max-h-[240px] flex-col gap-0.5 overflow-y-auto rounded-md border p-1 scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40">
          {specialties.map((s) => {
            const checked = selected.has(s.id);
            return (
              <button
                type="button"
                key={s.id}
                onClick={() => onToggle(s.id)}
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
                <span className="min-w-0 truncate">
                  {s.abbreviation ? `${s.abbreviation} — ` : ""}{s.name}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
