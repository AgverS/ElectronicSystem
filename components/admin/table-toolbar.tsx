"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { translate } from "@/lib/i18n/translate";
import { useRef, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { IconSearch, IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  key: string;
  placeholder: string;
  options: FilterOption[];
  allLabel?: string;
}

interface TableToolbarProps {
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  className?: string;
}

export function TableToolbar({
  searchPlaceholder = translate("ui.search"),
  filters = [],
  className,
}: TableToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handleSearch(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setParam("search", value), 400);
  }

  function clearAll() {
    startTransition(() => {
      router.push(pathname);
    });
  }

  const hasFilters =
    searchParams.has("search") || filters.some((f) => searchParams.has(f.key));

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="relative min-w-48 flex-1">
        <IconSearch
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder={searchPlaceholder}
          defaultValue={searchParams.get("search") ?? ""}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {filters.map((f) => (
        <SearchableSelect
          key={f.key}
          value={searchParams.get(f.key) ?? ""}
          onValueChange={(v) => setParam(f.key, v)}
          options={f.options}
          placeholder={f.placeholder}
          allLabel={f.allLabel ?? "Все"}
          className="w-44"
        />
      ))}

      {hasFilters && (
        <Button variant="ghost" onClick={clearAll} className="gap-1.5">
          <IconX size={14} />
          {translate("common.reset")}
        </Button>
      )}
    </div>
  );
}
