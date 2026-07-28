"use client";

import { useRouter } from "next/navigation";
import { IconSwitchHorizontal, IconCheck } from "@tabler/icons-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDemoSession } from "@/lib/demo-session";
import { useT } from "@/lib/i18n/provider";
import { Role } from "@/lib/prisma-client";
import { cn } from "@/lib/utils";

const HOME_FOR_ROLE: Record<string, string> = {
  [Role.ADMIN]: "/admin",
  [Role.TEACHER]: "/teacher",
  [Role.STUDENT]: "/student",
};

/**
 * Replaces sign-out. Rather than logging in as different people, the visitor
 * simply switches which person they are looking through.
 */
export function RoleSwitcher() {
  const { user, personas, setPersona } = useDemoSession();
  const router = useRouter();
  const t = useT();

  function choose(id: string, role: string) {
    setPersona(id);
    router.push(HOME_FOR_ROLE[role] ?? "/");
  }

  const grouped = [Role.ADMIN, Role.TEACHER, Role.STUDENT].map((role) => ({
    role,
    items: personas.filter((p) => p.role === role),
  }));

  return (
    <Popover>
      <PopoverTrigger className="flex flex-1 items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
        <IconSwitchHorizontal size={16} />
        <span className="truncate">{t("demo.switchRole")}</span>
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="w-64 p-1">
        <p className="px-2 py-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t("demo.viewingAs")}
        </p>
        {grouped.map(({ role, items }) =>
          items.length === 0 ? null : (
            <div key={role} className="mb-1 last:mb-0">
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground">{t(`role.${role}`)}</p>
              {items.map((persona) => (
                <button
                  key={persona.id}
                  onClick={() => choose(persona.id, persona.role)}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted",
                    persona.id === user?.id && "bg-primary/10",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{persona.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {persona.context}
                    </span>
                  </span>
                  {persona.id === user?.id && (
                    <IconCheck size={14} className="mt-0.5 shrink-0 text-primary" />
                  )}
                </button>
              ))}
            </div>
          ),
        )}
      </PopoverContent>
    </Popover>
  );
}
