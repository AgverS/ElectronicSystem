"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface DataPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  className?: string;
}

export function DataPagination({
  page,
  totalPages,
  total,
  limit,
  className,
}: DataPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  }

  const skip = (page - 1) * limit;

  return (
    <div className={cn("flex items-center justify-between text-sm", className)}>
      <p className="text-muted-foreground">
        Страница {page} из {totalPages} · записи {skip + 1}–
        {Math.min(skip + limit, total)} из {total.toLocaleString("ru-RU")}
      </p>
      <div className="flex items-center gap-1">
        {page > 1 && (
          <button
            onClick={() => goToPage(1)}
            className="flex h-8 items-center gap-1 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <IconChevronLeft size={14} />
            <IconChevronLeft size={14} className="-ml-2.5" />
          </button>
        )}
        {page > 1 && (
          <button
            onClick={() => goToPage(page - 1)}
            className="flex h-8 items-center gap-1 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <IconChevronLeft size={14} />
            Назад
          </button>
        )}

        {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
          let p: number;
          if (totalPages <= 7) {
            p = i + 1;
          } else if (page <= 4) {
            p = i + 1;
          } else if (page >= totalPages - 3) {
            p = totalPages - 6 + i;
          } else {
            p = page - 3 + i;
          }
          return (
            <button
              key={p}
              onClick={() => goToPage(p)}
              className={cn(
                "flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm transition-colors hover:bg-muted",
                p === page
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {p}
            </button>
          );
        })}

        {page < totalPages && (
          <button
            onClick={() => goToPage(page + 1)}
            className="flex h-8 items-center gap-1 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Вперёд
            <IconChevronRight size={14} />
          </button>
        )}
        {page < totalPages && (
          <button
            onClick={() => goToPage(totalPages)}
            className="flex h-8 items-center gap-1 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <IconChevronRight size={14} />
            <IconChevronRight size={14} className="-ml-2.5" />
          </button>
        )}
      </div>
    </div>
  );
}
