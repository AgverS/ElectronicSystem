"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, type Variants } from "framer-motion";
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
  IconHistory,
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { BrandMark } from "@/components/brand-mark";
import { BellsView } from "@/components/bells/bells-view";
import type { BellContext } from "@/lib/bell-times";
import { loadBellContext } from "@/lib/bells-data";
import { useT } from "@/lib/i18n/provider";
import { RoleSwitcher } from "@/components/demo/role-switcher";
import { LanguageSwitcher } from "@/components/demo/language-switcher";
import { ThemeToggle } from "@/components/demo/theme-toggle";
import { ResetDemoButton } from "@/components/demo/reset-demo-button";

interface NavItem {
  href: string;
  labelKey: string;
  Icon: ElementType;
  exact?: boolean;
}

interface NavGroup {
  labelKey: string;
  Icon: ElementType;
  items: NavItem[];
}

interface NavActionItem {
  action: "bells";
  labelKey: string;
  Icon: ElementType;
}

type SidebarItem = NavItem | NavGroup | NavActionItem;

const ADMIN_NAV: SidebarItem[] = [
  { href: "/admin", labelKey: "nav.overview", Icon: IconLayoutDashboard, exact: true },
  {
    labelKey: "nav.academic",
    Icon: IconBook,
    items: [
      { href: "/admin/journals", labelKey: "nav.journals", Icon: IconNotebook },
      { href: "/admin/attendance", labelKey: "nav.attendanceReport", Icon: IconReportAnalytics },
      { href: "/admin/schedule", labelKey: "nav.schedule", Icon: IconCalendarWeek },
      { href: "/admin/bells", labelKey: "nav.bells", Icon: IconBell },
      { href: "/admin/records", labelKey: "nav.records", Icon: IconAward },
    ],
  },
  {
    labelKey: "nav.management",
    Icon: IconUsersGroup,
    items: [
      { href: "/admin/users", labelKey: "nav.users", Icon: IconUsers },
      { href: "/admin/groups", labelKey: "nav.groups", Icon: IconUsersGroup },
      { href: "/admin/specialties", labelKey: "nav.specialties", Icon: IconLayersLinked },
      { href: "/admin/subjects", labelKey: "nav.subjects", Icon: IconBook },
      { href: "/admin/semesters", labelKey: "nav.semesters", Icon: IconCalendar },
      { href: "/admin/assignments", labelKey: "nav.assignments", Icon: IconClipboardList },
    ],
  },
  {
    labelKey: "nav.system",
    Icon: IconDatabase,
    items: [
      { href: "/admin/backups", labelKey: "nav.backups", Icon: IconDatabase },
      { href: "/admin/logs", labelKey: "nav.logs", Icon: IconHistory },
    ],
  },
];

const TEACHER_NAV: SidebarItem[] = [
  { href: "/teacher", labelKey: "nav.myJournals", Icon: IconNotebook, exact: true },
  { href: "/teacher/curated", labelKey: "nav.curatedGroups", Icon: IconUsersGroup },
  { href: "/teacher/attendance", labelKey: "nav.attendanceReport", Icon: IconReportAnalytics },
  { href: "/teacher/schedule", labelKey: "nav.schedule", Icon: IconCalendarWeek },
  { action: "bells", labelKey: "nav.bells", Icon: IconBell },
];

const TEACHER_ADMIN_NAV: SidebarItem[] = [
  ...TEACHER_NAV,
  { href: "/admin", labelKey: "nav.adminPanel", Icon: IconArrowLeft },
];

const STUDENT_NAV: SidebarItem[] = [
  {
    labelKey: "nav.myAccount",
    Icon: IconUserCircle,
    items: [
      { href: "/student/profile", labelKey: "nav.profile", Icon: IconUserCircle },
      { href: "/student/group", labelKey: "nav.myGroup", Icon: IconUsersGroup },
    ],
  },
  {
    labelKey: "nav.study",
    Icon: IconBook,
    items: [
      { href: "/student", labelKey: "nav.myMarks", Icon: IconBook, exact: true },
      { href: "/student/labs", labelKey: "nav.labs", Icon: IconFlask },
      { href: "/student/results", labelKey: "nav.results", Icon: IconChartBar },
      { href: "/student/schedule", labelKey: "nav.schedule", Icon: IconCalendarWeek },
    ],
  },
  { action: "bells", labelKey: "nav.bells", Icon: IconBell },
  { href: "/student/records", labelKey: "nav.records", Icon: IconAward },
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

export function Sidebar({ section, title, userName, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const t = useT();
  const items = NAV_MAP[section];

  const [bellsOpen, setBellsOpen] = React.useState(false);
  const [bellsCtx, setBellsCtx] = React.useState<BellContext | null>(null);

  async function handleBellsOpen() {
    setBellsOpen(true);
    if (!bellsCtx) setBellsCtx(await loadBellContext());
  }

  return (
    <>
      <aside className="flex h-svh w-56 flex-col border-r bg-card text-card-foreground">
        <div className="flex items-center gap-2.5 border-b px-4 py-3.5">
          <BrandMark className="size-7 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-sm font-bold tracking-tight">{userName}</p>
            <p className="truncate text-xs text-muted-foreground">{title}</p>
          </div>
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
                    key={item.labelKey}
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
            <RoleSwitcher />
            <ResetDemoButton />
            <LanguageSwitcher className="px-1.5" />
            <ThemeToggle />
          </div>
        </div>
      </aside>

      <Sheet open={bellsOpen} onOpenChange={setBellsOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>{t("bells.title")}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {bellsCtx ? (
              <BellsView ctx={bellsCtx} />
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <IconLoader2 size={16} className="animate-spin" />
                {t("common.loading")}
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
  variants?: Variants;
}) {
  const t = useT();
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
        {t(item.labelKey)}
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
  variants?: Variants;
  isChild?: boolean;
  tabbable?: boolean;
}) {
  const t = useT();
  const active = item.exact
    ? pathname === item.href
    : pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

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
            active ? "text-primary" : "text-muted-foreground group-hover/nav:text-foreground",
          )}
        />
        {t(item.labelKey)}
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
  itemVariants: Variants;
}) {
  const t = useT();
  const isAnyChildActive = group.items.some((item) =>
    item.exact
      ? pathname === item.href
      : pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)),
  );

  // A group follows whether one of its pages is open, until the visitor
  // expands or collapses it themselves; navigating into the group hands
  // control back. Adjusted during render rather than in an effect, so
  // navigation does not cost an extra render pass.
  const [manuallyToggled, setManuallyToggled] = React.useState<boolean | null>(null);
  const [wasChildActive, setWasChildActive] = React.useState(isAnyChildActive);

  if (wasChildActive !== isAnyChildActive) {
    setWasChildActive(isAnyChildActive);
    if (isAnyChildActive) setManuallyToggled(null);
  }

  const isOpen = manuallyToggled ?? isAnyChildActive;
  const setIsOpen = setManuallyToggled;

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
        <span className="flex-1 text-left">{t(group.labelKey)}</span>
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
