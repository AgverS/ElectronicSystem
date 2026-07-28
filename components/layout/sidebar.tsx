"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import {
  IconLayoutDashboard,
  IconUsers,
  IconUsersGroup,
  IconBook,
  IconCalendar,
  IconCalendarWeek,
  IconClipboardList,
  IconNotebook,
  IconAward,
  IconArrowLeft,
  IconSun,
  IconMoon,
  IconHistory,
  IconLogout,
  IconFlask,
  IconChartBar,
  IconUserCircle,
  IconReportAnalytics,
  IconDatabase,
  IconLayersLinked,
  IconBell,
  IconChevronDown,
  IconLoader2,
} from "@tabler/icons-react";
import type { ElementType } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { BrandMark } from "@/components/brand-mark";
import { BellsView } from "@/components/bells/bells-view";
import type { BellContext } from "@/lib/bell-times";
import { BugReportButton } from "@/components/bug-report-button";

interface NavItem {
  href: string;
  label: string;
  Icon: ElementType;
  exact?: boolean;
}

interface NavGroup {
  label: string;
  Icon: ElementType;
  items: NavItem[];
}

interface NavActionItem {
  action: "bells";
  label: string;
  Icon: ElementType;
}

type SidebarItem = NavItem | NavGroup | NavActionItem;

const ADMIN_NAV: SidebarItem[] = [
  { href: "/admin", label: "Обзор", Icon: IconLayoutDashboard, exact: true },
  {
    label: "Учебный процесс",
    Icon: IconBook,
    items: [
      { href: "/admin/journals", label: "Журналы", Icon: IconNotebook },
      {
        href: "/admin/attendance",
        label: "Ведомость пропусков",
        Icon: IconReportAnalytics,
      },
      { href: "/admin/schedule", label: "Расписание", Icon: IconCalendarWeek },
      { href: "/admin/bells", label: "Звонки", Icon: IconBell },
      {
        href: "/admin/records",
        label: "Поощрения и взыскания",
        Icon: IconAward,
      },
    ],
  },
  {
    label: "Управление",
    Icon: IconUsersGroup,
    items: [
      { href: "/admin/users", label: "Пользователи", Icon: IconUsers },
      { href: "/admin/groups", label: "Группы", Icon: IconUsersGroup },
      {
        href: "/admin/specialties",
        label: "Специальности",
        Icon: IconLayersLinked,
      },
      { href: "/admin/subjects", label: "Предметы", Icon: IconBook },
      { href: "/admin/semesters", label: "Семестры", Icon: IconCalendar },
      {
        href: "/admin/assignments",
        label: "Назначения",
        Icon: IconClipboardList,
      },
    ],
  },
  {
    label: "Система",
    Icon: IconDatabase,
    items: [
      { href: "/admin/backups", label: "Бэкапы", Icon: IconDatabase },
      { href: "/admin/logs", label: "Логи", Icon: IconHistory },
    ],
  },
];

const TEACHER_NAV: SidebarItem[] = [
  { href: "/teacher", label: "Мои журналы", Icon: IconNotebook, exact: true },
  {
    href: "/teacher/curated",
    label: "Курируемые группы",
    Icon: IconUsersGroup,
  },
  {
    href: "/teacher/attendance",
    label: "Ведомость пропусков",
    Icon: IconReportAnalytics,
  },
  { href: "/teacher/schedule", label: "Расписание", Icon: IconCalendarWeek },
  { action: "bells", label: "Звонки", Icon: IconBell },
];

const TEACHER_ADMIN_NAV: SidebarItem[] = [
  { href: "/teacher", label: "Мои журналы", Icon: IconNotebook, exact: true },
  {
    href: "/teacher/curated",
    label: "Курируемые группы",
    Icon: IconUsersGroup,
  },
  {
    href: "/teacher/attendance",
    label: "Ведомость пропусков",
    Icon: IconReportAnalytics,
  },
  { href: "/teacher/schedule", label: "Расписание", Icon: IconCalendarWeek },
  { action: "bells", label: "Звонки", Icon: IconBell },
  { href: "/admin", label: "Панель админа", Icon: IconArrowLeft },
];

const STUDENT_NAV: SidebarItem[] = [
  {
    label: "Мой кабинет",
    Icon: IconUserCircle,
    items: [
      { href: "/student/profile", label: "Профиль", Icon: IconUserCircle },
      { href: "/student/group", label: "Моя группа", Icon: IconUsersGroup },
    ],
  },
  {
    label: "Учеба",
    Icon: IconBook,
    items: [
      { href: "/student", label: "Мои отметки", Icon: IconBook, exact: true },
      { href: "/student/labs", label: "Лабораторные работы", Icon: IconFlask },
      {
        href: "/student/results",
        label: "Итоги семестров",
        Icon: IconChartBar,
      },
      {
        href: "/student/schedule",
        label: "Расписание",
        Icon: IconCalendarWeek,
      },
    ],
  },
  { action: "bells", label: "Звонки", Icon: IconBell },
  { href: "/student/records", label: "Поощрения и взыскания", Icon: IconAward },
];

export type SidebarSection = "admin" | "teacher" | "teacher-admin" | "student";

interface SidebarProps {
  section: SidebarSection;
  title: string;
  userName: string;
  onNavigate?: () => void;
}

const NAV_MAP: Record<SidebarSection, SidebarItem[]> = {
  admin: ADMIN_NAV,
  teacher: TEACHER_NAV,
  "teacher-admin": TEACHER_ADMIN_NAV,
  student: STUDENT_NAV,
};

const navVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.03 } },
};
const itemVariants = {
  hidden: { opacity: 0, x: -12 },
  show: {
    opacity: 1,
    x: 0,
    transition: { type: "spring" as const, stiffness: 280, damping: 22 },
  },
};
const subItemsVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.08 } },
};

export function Sidebar({
  section,
  title,
  userName,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const items = NAV_MAP[section];

  const [bellsOpen, setBellsOpen] = React.useState(false);
  const [bellsCtx, setBellsCtx] = React.useState<BellContext | null>(null);

  async function handleBellsOpen() {
    setBellsOpen(true);
    if (!bellsCtx) {
      const res = await fetch("/api/bells");
      const data: BellContext = await res.json();
      setBellsCtx(data);
    }
  }

  async function handleLogout() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <aside className="flex h-svh w-56 flex-col border-r bg-card text-card-foreground">
        <div className="flex items-center gap-2.5 border-b px-4 py-3.5">
          <BrandMark className="size-7 shrink-0" />
          <p className="min-w-0 truncate font-heading text-sm font-bold tracking-tight">
            {userName}
          </p>
        </div>
        <motion.nav
          className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40"
          variants={navVariants}
          initial="hidden"
          animate="show"
        >
          <div className="flex flex-col gap-0.5">
            {items.map((item) => {
              if ("items" in item) {
                return (
                  <NavGroupComponent
                    key={item.label}
                    group={item}
                    pathname={pathname}
                    onNavigate={onNavigate}
                    itemVariants={itemVariants}
                  />
                );
              }

              if ("action" in item) {
                return (
                  <NavActionButton
                    key={item.action}
                    item={item}
                    onClick={handleBellsOpen}
                    variants={itemVariants}
                  />
                );
              }

              return (
                <NavItemLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  onNavigate={onNavigate}
                  variants={itemVariants}
                />
              );
            })}
          </div>
        </motion.nav>
        <div className="border-t p-3">
          <div className="flex items-center gap-1">
            <button
              onClick={handleLogout}
              className="flex-1 rounded-md px-3 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive flex gap-2 items-center"
            >
              <IconLogout size={16} />
              Выйти
            </button>
            <BugReportButton />
            {mounted && (
              <button
                onClick={() =>
                  setTheme(resolvedTheme === "dark" ? "light" : "dark")
                }
                className="rounded-md p-1.5 text-muted-foreground transition-all duration-300 hover:bg-muted hover:text-foreground hover:rotate-12 active:scale-90"
                title="Сменить тему (D)"
              >
                {resolvedTheme === "dark" ? (
                  <IconSun size={16} />
                ) : (
                  <IconMoon size={16} />
                )}
              </button>
            )}
          </div>
        </div>
      </aside>

      <Sheet open={bellsOpen} onOpenChange={setBellsOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Расписание звонков</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {bellsCtx ? (
              <BellsView ctx={bellsCtx} />
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <IconLoader2 size={16} className="animate-spin" />
                Загрузка...
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function NavActionButton({
  item,
  onClick,
  variants,
}: {
  item: NavActionItem;
  onClick: () => void;
  variants?: any;
}) {
  return (
    <motion.div variants={variants}>
      <button
        onClick={onClick}
        className="group/nav relative flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-all duration-200 hover:bg-muted hover:translate-x-0.5 hover:text-foreground motion-reduce:transition-none motion-reduce:hover:translate-x-0"
      >
        <item.Icon
          size={16}
          className="text-muted-foreground transition-transform duration-200 ease-out group-hover/nav:scale-110 group-hover/nav:text-foreground motion-reduce:transition-none motion-reduce:group-hover/nav:scale-100"
        />
        {item.label}
      </button>
    </motion.div>
  );
}

function NavItemLink({
  item,
  pathname,
  onNavigate,
  variants,
  isChild = false,
  tabbable = true,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
  variants?: any;
  isChild?: boolean;
  tabbable?: boolean;
}) {
  const active = item.exact
    ? pathname === item.href
    : pathname === item.href ||
      (item.href !== "/" && pathname.startsWith(item.href));

  return (
    <motion.div variants={variants}>
      <Link
        href={item.href}
        onClick={onNavigate}
        tabIndex={tabbable ? undefined : -1}
        aria-hidden={!tabbable}
        className={cn(
          "group/nav relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-all duration-200 hover:bg-muted hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:hover:translate-x-0",
          active
            ? "bg-primary/10 font-medium text-primary hover:bg-primary/15"
            : "text-muted-foreground hover:text-foreground",
          isChild && "pl-9",
        )}
      >
        <span
          className={cn(
            "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary transition-transform duration-200 ease-out",
            active ? "scale-y-100" : "scale-y-0",
          )}
        />
        <item.Icon
          size={16}
          className={cn(
            "transition-transform duration-200 ease-out group-hover/nav:scale-110 motion-reduce:transition-none motion-reduce:group-hover/nav:scale-100",
            active
              ? "text-primary"
              : "text-muted-foreground group-hover/nav:text-foreground",
          )}
        />
        {item.label}
      </Link>
    </motion.div>
  );
}

function NavGroupComponent({
  group,
  pathname,
  onNavigate,
  itemVariants,
}: {
  group: NavGroup;
  pathname: string;
  onNavigate?: () => void;
  itemVariants: any;
}) {
  const isAnyChildActive = group.items.some((item) =>
    item.exact
      ? pathname === item.href
      : pathname === item.href ||
        (item.href !== "/" && pathname.startsWith(item.href)),
  );

  const [isOpen, setIsOpen] = React.useState(isAnyChildActive);

  React.useEffect(() => {
    if (isAnyChildActive) setIsOpen(true);
  }, [isAnyChildActive]);

  return (
    <div className="flex flex-col">
      <motion.button
        variants={itemVariants}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className={cn(
          "group/nav flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:hover:translate-x-0",
          isAnyChildActive && !isOpen && "text-foreground font-medium",
        )}
      >
        <group.Icon
          size={16}
          className="transition-transform duration-200 ease-out group-hover/nav:scale-110 motion-reduce:transition-none motion-reduce:group-hover/nav:scale-100"
        />
        <span className="flex-1 text-left">{group.label}</span>
        <IconChevronDown
          size={14}
          className={cn(
            "transition-transform duration-200",
            isOpen ? "rotate-0" : "-rotate-90 opacity-60",
          )}
        />
      </motion.button>
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="min-h-0 overflow-hidden">
          <motion.div
            className="flex flex-col gap-0.5 py-0.5"
            initial="hidden"
            animate="show"
            variants={subItemsVariants}
          >
            {group.items.map((item) => (
              <NavItemLink
                key={item.href}
                item={item}
                pathname={pathname}
                onNavigate={onNavigate}
                variants={itemVariants}
                isChild
                tabbable={isOpen}
              />
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
