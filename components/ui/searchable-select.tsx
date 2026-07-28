"use client";

import { useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { IconCheck, IconSelector } from "@tabler/icons-react";

export interface SearchableOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  allLabel?: string;
  className?: string;
  disabled?: boolean;
  portalled?: boolean;
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Выберите…",
  searchPlaceholder = "Поиск…",
  allLabel,
  className,
  disabled,
  portalled,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [triggerWidth, setTriggerWidth] = useState<number>();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered =
    search.trim() === ""
      ? options
      : options.filter((o) =>
          o.label.toLowerCase().includes(search.toLowerCase())
        );

  function pick(v: string) {
    onValueChange(v);
    setOpen(false);
    setSearch("");
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setSearch("");
      setTriggerWidth(triggerRef.current?.offsetWidth);
      // Focus input after popover opens
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          disabled={disabled}
          data-placeholder={!selected && !allLabel ? true : undefined}
          className={cn(
            "flex w-fit items-center justify-between gap-1.5 rounded-md border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 h-9 dark:bg-input/30 dark:hover:bg-input/50",
            !selected && !allLabel && "text-muted-foreground",
            className
          )}
          type="button"
        >
          <span className="truncate">
            {value === "" && allLabel
              ? allLabel
              : (selected?.label ?? placeholder)}
          </span>
          <IconSelector className="pointer-events-none size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={4}
        style={triggerWidth ? { width: triggerWidth } : undefined}
        className="min-w-48 p-0 overflow-hidden"
        portalled={portalled}
      >
        <div className="border-b p-2">
          <Input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 text-sm"
          />
        </div>

        <div className="max-h-60 overflow-y-auto p-1">
          {allLabel !== undefined && (
            <button
              onClick={() => pick("")}
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-foreground/10 transition-colors",
                value === "" && "font-medium"
              )}
              type="button"
            >
              <IconCheck
                size={14}
                className={cn(
                  "shrink-0 text-foreground",
                  value === "" ? "opacity-100" : "opacity-0"
                )}
              />
              <span className="text-muted-foreground">{allLabel}</span>
            </button>
          )}

          {filtered.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Не найдено
            </p>
          ) : (
            filtered.map((o) => (
              <button
                key={o.value}
                onClick={() => pick(o.value)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-foreground/10 transition-colors",
                  o.value === value && "font-medium"
                )}
                type="button"
              >
                <IconCheck
                  size={14}
                  className={cn(
                    "shrink-0 text-foreground",
                    o.value === value ? "opacity-100" : "opacity-0"
                  )}
                />
                {o.label}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
