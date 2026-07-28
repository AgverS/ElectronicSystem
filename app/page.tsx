"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconArrowRight,
  IconChalkboard,
  IconSchool,
  IconSettings,
  IconCalendarWeek,
  IconClipboardCheck,
  IconChartBar,
  IconAward,
  IconFileExport,
  IconDeviceMobile,
  IconLoader2,
} from "@tabler/icons-react";
import { BrandMark } from "@/components/brand-mark";
import { LanguageSwitcher } from "@/components/demo/language-switcher";
import { ThemeToggle } from "@/components/demo/theme-toggle";
import { useDemoSession } from "@/lib/demo-session";
import { useT } from "@/lib/i18n/provider";
import { Role } from "@/lib/prisma-client";
import { cn } from "@/lib/utils";

const ROLE_CARDS = [
  { role: Role.ADMIN, href: "/admin", Icon: IconSettings },
  { role: Role.TEACHER, href: "/teacher", Icon: IconChalkboard },
  { role: Role.STUDENT, href: "/student", Icon: IconSchool },
] as const;

const FEATURES = [
  { Icon: IconClipboardCheck, key: "attendance" },
  { Icon: IconCalendarWeek, key: "timetable" },
  { Icon: IconChartBar, key: "reporting" },
  { Icon: IconAward, key: "records" },
  { Icon: IconFileExport, key: "exports" },
  { Icon: IconDeviceMobile, key: "mobile" },
] as const;

export default function LandingPage() {
  const { personas, setPersona, ready } = useDemoSession();
  const router = useRouter();
  const t = useT();

  function enterAs(role: string, href: string) {
    const persona = personas.find((p) => p.role === role);
    if (!persona) return;
    setPersona(persona.id);
    router.push(href);
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center gap-3 border-b px-4 py-3 sm:px-8">
        <BrandMark className="size-7 shrink-0" />
        <p className="min-w-0 flex-1 truncate font-heading text-sm font-bold tracking-tight">
          {t("app.name")}
        </p>
        <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-primary">
          {t("demo.badge")}
        </span>
        <LanguageSwitcher />
        <ThemeToggle />
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-4 py-12 sm:px-8 sm:py-16">
        <section className="flex flex-col gap-4">
          <p className="font-mono text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("app.institution")}
          </p>
          <h1 className="max-w-3xl font-heading text-3xl font-extrabold tracking-tight text-balance sm:text-5xl">
            {t("landing.heading")}
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground text-pretty sm:text-lg">
            {t("landing.subheading")}
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {ROLE_CARDS.map(({ role, href, Icon }) => (
            <button
              key={role}
              onClick={() => enterAs(role, href)}
              disabled={!ready}
              className={cn(
                "group flex flex-col gap-3 rounded-xl border bg-card p-5 text-left shadow-xs transition-all",
                "hover:border-primary/40 hover:shadow-md focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                "disabled:pointer-events-none disabled:opacity-60 motion-reduce:transition-none",
              )}
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon size={20} />
              </span>
              <span className="font-heading text-lg font-bold tracking-tight">
                {t(`landing.role.${role.toLowerCase()}.title`)}
              </span>
              <span className="flex-1 text-sm text-muted-foreground text-pretty">
                {t(`landing.role.${role.toLowerCase()}.body`)}
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                {ready ? (
                  <>
                    {t("landing.enter")}
                    <IconArrowRight
                      size={15}
                      className="transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                    />
                  </>
                ) : (
                  <>
                    <IconLoader2 size={15} className="animate-spin" />
                    {t("common.loading")}
                  </>
                )}
              </span>
            </button>
          ))}
        </section>

        <section className="rounded-xl border bg-muted/30 p-5">
          <h2 className="font-heading text-sm font-bold tracking-tight">
            {t("demo.banner.title")}
          </h2>
          <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground text-pretty">
            {t("demo.banner.body")}
          </p>
        </section>

        <section className="flex flex-col gap-5">
          <h2 className="font-heading text-xl font-bold tracking-tight">
            {t("landing.features")}
          </h2>
          <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ Icon, key }) => (
              <div key={key} className="flex gap-3">
                <Icon size={18} className="mt-0.5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t(`landing.feature.${key}.title`)}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground text-pretty">
                    {t(`landing.feature.${key}.body`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t px-4 py-6 text-center text-sm text-muted-foreground sm:px-8">
        <p>{t("landing.footer.source")}</p>
        <p className="mt-1">
          <Link href="/schedule" className="text-primary underline-offset-4 hover:underline">
            {t("landing.publicSchedule")}
          </Link>
        </p>
      </footer>
    </div>
  );
}
