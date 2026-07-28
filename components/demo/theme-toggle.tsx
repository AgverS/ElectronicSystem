"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { IconSun, IconMoon } from "@tabler/icons-react";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const t = useT();
  // Avoids a hydration mismatch: the resolved theme is only known on the client.
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!mounted) return <span className={cn("size-7", className)} />;

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className={cn(
        "rounded-md p-1.5 text-muted-foreground transition-all duration-300 hover:bg-muted hover:text-foreground hover:rotate-12 active:scale-90 motion-reduce:transition-none motion-reduce:hover:rotate-0",
        className,
      )}
      title={t("common.theme")}
      aria-label={t("common.theme")}
    >
      {resolvedTheme === "dark" ? <IconSun size={16} /> : <IconMoon size={16} />}
    </button>
  );
}
