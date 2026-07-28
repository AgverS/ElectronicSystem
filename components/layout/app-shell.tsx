"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import type { SidebarSection } from "./sidebar";
import { IconMenu2 } from "@tabler/icons-react";
import { useT } from "@/lib/i18n/provider";

interface AppShellProps {
  section: SidebarSection;
  title: string;
  userName: string;
  children: React.ReactNode;
}

export function AppShell({ section, title, userName, children }: AppShellProps) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const t = useT();

  const closeMenu = () => {
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 300);
  };

  return (
    <div className="flex h-svh">
      {(open || closing) && (
        <div
          className={
            "fixed inset-0 z-40 bg-black/50 duration-300 md:hidden " +
            (closing ? "animate-out fade-out" : "animate-in fade-in")
          }
          onClick={closeMenu}
        />
      )}

      <div
        className={
          "fixed inset-y-0 left-0 z-50 duration-300 md:relative md:flex md:animate-none print:hidden " +
          (open || closing
            ? "flex " + (closing ? "animate-out slide-out-to-left" : "animate-in slide-in-from-left")
            : "hidden md:flex")
        }
      >
        <Sidebar
          section={section}
          title={title}
          userName={userName}
          onNavigate={closeMenu}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b bg-card px-4 py-3 md:hidden print:hidden">
          <button
            onClick={() => setOpen(true)}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={t("nav.openMenu")}
          >
            <IconMenu2 size={20} />
          </button>
        </header>

        <main className="flex-1 overflow-auto p-3 pb-[calc(12px+env(safe-area-inset-bottom))] sm:p-6 sm:pb-[calc(24px+env(safe-area-inset-bottom))] print:overflow-visible print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
