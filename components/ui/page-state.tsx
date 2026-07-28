"use client";

import { IconLoader2 } from "@tabler/icons-react";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

/** Shown while a screen's data is being read from the demo database. */
export function PageLoading({ className }: { className?: string }) {
  const t = useT();
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground",
        className,
      )}
      role="status"
    >
      <IconLoader2 size={16} className="animate-spin" />
      {t("common.loading")}
    </div>
  );
}

/** Placeholder for a screen, table or section with nothing to show. */
export function EmptyState({
  title,
  description,
  className,
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  const t = useT();
  return (
    <div className={cn("px-4 py-10 text-center", className)}>
      <p className="text-sm font-medium text-muted-foreground">{title ?? t("common.noData")}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground/80 text-pretty">
          {description}
        </p>
      )}
    </div>
  );
}
