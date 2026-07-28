"use client";

import { IconLanguage, IconCheck } from "@tabler/icons-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LOCALES, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  const active = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          className,
        )}
        title={t("common.language")}
        aria-label={t("common.language")}
      >
        <IconLanguage size={16} />
        <span className="font-mono text-xs uppercase">{active.code}</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1">
        {LOCALES.map((option) => (
          <button
            key={option.code}
            onClick={() => setLocale(option.code as Locale)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted",
              option.code === locale ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            <span aria-hidden>{option.flag}</span>
            <span className="flex-1">{option.label}</span>
            {option.code === locale && <IconCheck size={14} className="text-primary" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
