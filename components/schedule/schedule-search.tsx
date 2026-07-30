"use client";

import { useEffect, useRef, useState } from "react";
import { translate } from "@/lib/i18n/translate";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  IconSearch,
  IconUsersGroup,
  IconUser,
  IconDoor,
  IconLoader2,
} from "@tabler/icons-react";

type ResultKind = "group" | "teacher" | "room";

export type SearchResult = {
  kind: ResultKind;
  id?: string;
  label: string;
  href: string;
  value?: string;
};

const KIND_LABEL: Record<ResultKind, string> = {
  group: translate("term.group"),
  teacher: translate("landing.role.teacher.title"),
  room: translate("common.room"),
};

const KIND_ICON: Record<ResultKind, React.ElementType> = {
  group: IconUsersGroup,
  teacher: IconUser,
  room: IconDoor,
};

interface ScheduleSearchProps {
  onSelect?: (result: SearchResult) => void;
}

export function ScheduleSearch({ onSelect }: ScheduleSearchProps = {}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/schedule/search?q=${encodeURIComponent(query.trim())}`,
        );
        const data = await res.json();

        const all: SearchResult[] = [
          ...data.groups.map((g: { id: string; name: string }) => ({
            kind: "group" as const,
            id: g.id,
            label: g.name,
            href: `/schedule?group=${g.id}`,
          })),
          ...data.teachers.map((t: { id: string; name: string }) => ({
            kind: "teacher" as const,
            id: t.id,
            label: t.name,
            href: `/schedule?teacher=${t.id}`,
          })),
          ...data.rooms.map((room: string) => ({
            kind: "room" as const,
            label: `Кабинет ${room}`,
            href: `/schedule?room=${encodeURIComponent(room)}`,
            value: room,
          })),
        ];

        setResults(all);
        setOpen(true);
        setActiveIdx(-1);
      } finally {
        setLoading(false);
      }
    }, 200);
  }, [query]);

  function go(result: SearchResult) {
    if (onSelect) {
      onSelect(result);
    } else {
      router.push(result.href);
    }
    setOpen(false);
    setQuery("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = activeIdx >= 0 ? results[activeIdx] : results[0];
      if (target) go(target);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // Close on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        {loading ? (
          <IconLoader2
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground"
          />
        ) : (
          <IconSearch
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
        )}
        <Input
          value={query}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            if (!val.trim()) {
              setResults([]);
              setOpen(false);
            }
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={translate("ui.groupTeacherOrRoom")}
          className="pl-9"
          autoComplete="off"
        />
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border bg-popover shadow-md">
          {results.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              {translate("ui.nothingFound")}
            </p>
          ) : (
            results.map((r, i) => {
              const Icon = KIND_ICON[r.kind];
              return (
                <button
                  key={`${r.kind}-${r.id ?? r.label}`}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    go(r);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2.5 text-sm transition-colors text-left",
                    i === activeIdx
                      ? "bg-foreground/10"
                      : "hover:bg-foreground/5",
                  )}
                >
                  <Icon size={14} className="shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{r.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {KIND_LABEL[r.kind]}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
