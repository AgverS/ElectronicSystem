"use client";

import { useRouter } from "next/navigation";
import { IconLoader2, IconLock } from "@tabler/icons-react";
import { AppShell } from "@/components/layout/app-shell";
import type { SidebarSection } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { useDemoSession, type DemoUser } from "@/lib/demo-session";
import { useT } from "@/lib/i18n/provider";
import type { Role } from "@/lib/prisma-client";

/**
 * Wraps a role's screens. With no sign-in there is nobody to redirect to a
 * login page, so a visitor who lands on the wrong area is offered the way back
 * instead of being bounced.
 */
export function RoleGate({
  allow,
  section,
  titleKey,
  children,
}: {
  allow: Role[];
  section: SidebarSection | ((user: DemoUser) => SidebarSection);
  titleKey: string;
  children: (user: DemoUser) => React.ReactNode;
}) {
  const { user, ready } = useDemoSession();
  const router = useRouter();
  const t = useT();

  if (!ready) {
    return (
      <div className="flex h-svh items-center justify-center gap-2 text-sm text-muted-foreground">
        <IconLoader2 size={16} className="animate-spin" />
        {t("common.loading")}
      </div>
    );
  }

  if (!user || !allow.includes(user.role)) {
    return (
      <div className="flex h-svh flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <IconLock size={20} />
        </span>
        <div>
          <h1 className="font-heading text-xl font-bold tracking-tight">
            {t("gate.wrongRole.title")}
          </h1>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground text-pretty">
            {t("gate.wrongRole.body")}
          </p>
        </div>
        <Button onClick={() => router.push("/")}>{t("gate.wrongRole.action")}</Button>
      </div>
    );
  }

  const resolved = typeof section === "function" ? section(user) : section;

  return (
    <AppShell section={resolved} title={t(titleKey)} userName={user.name}>
      {children(user)}
    </AppShell>
  );
}
