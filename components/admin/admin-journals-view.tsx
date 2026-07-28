"use client";

import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import Link from "next/link";
import { cn, shortName } from "@/lib/utils";
import { IconNotebook, IconUsers, IconChevronLeft } from "@tabler/icons-react";
import { formatCourse } from "@/lib/group-course";
import {
  TableToolbar,
  type FilterConfig,
} from "@/components/admin/table-toolbar";
import { DataPagination } from "@/components/ui/data-pagination";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface AdminJournalsViewProps {
  curatedGroupsCount: number;
  teachers: { id: string; name: string }[];
}

type Assignment = {
  id: string;
  subject: { name: string };
  group: { id: string; name: string };
  teachers: { name: string }[];
  lessons: { id: string }[];
};

type Group = {
  id: string;
  name: string;
  assignments: Assignment[];
};

function AdminJournalsViewInner({
  curatedGroupsCount,
  teachers,
}: AdminJournalsViewProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const tab = searchParams.get("tab") ?? "all";
  const search = searchParams.get("search");

  function setTab(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "all") {
      params.delete("tab");
    } else {
      params.set("tab", key);
    }
    params.delete("page");
    params.delete("search");
    setSelectedGroupId(null);
    router.push(`${pathname}?${params.toString()}`);
  }

  const tabItems = [
    { key: "all", label: "Все журналы" },
    ...(curatedGroupsCount > 0
      ? [{ key: "curated", label: "Курируемые группы" }]
      : []),
  ];

  const { data, isFetching } = useQuery({
    queryKey: ["admin-journals", searchParams.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/admin/journals?${searchParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch journals");
      return res.json() as Promise<{
        data: Group[];
        total: number;
        totalPages: number;
        page: number;
        limit: number;
      }>;
    },
  });

  const teacherFilters: FilterConfig[] = [
    {
      key: "teacherId",
      placeholder: "Преподаватель",
      allLabel: "Все преподаватели",
      options: teachers.map((t) => ({ value: t.id, label: t.name })),
    },
  ];

  const groups = data?.data || [];
  const currentGroup = selectedGroupId ? groups.find(g => g.id === selectedGroupId) : null;

  // Reset selection when search becomes active (derived during render, no effect needed)
  const [prevSearch, setPrevSearch] = useState(search);
  if (search !== prevSearch) {
    setPrevSearch(search);
    if (search) {
      setSelectedGroupId(null);
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Журналы</h1>

      {tabItems.length > 1 &&
        <div className="mt-4 border-b">
          <nav className="-mb-px flex">
            {tabItems.map((t) => {
              const active = tab === t.key || (t.key === "all" && tab === "all");
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm transition-colors",
                    active
                      ? "border-primary font-medium text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>}

      <div className="mt-5 flex flex-col gap-4">
        <Suspense>
          <TableToolbar
            searchPlaceholder={
              tab === "all"
                ? "Поиск по преподавателю, группе или предмету…"
                : "Поиск по названию группы…"
            }
          />
        </Suspense>

        <div
          style={{ opacity: isFetching ? 0.6 : 1 }}
          className="transition-opacity"
        >
          {!groups.length ? (
            <p className="text-muted-foreground">
              {isFetching ? "Загрузка…" : tab === "all" ? "Нет назначений." : "Вы не являетесь куратором ни одной группы."}
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              <AnimatePresence mode="wait">
                {search ? (
                  <motion.div
                    key="search-results"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-col gap-8"
                  >
                    {groups.map((g) => (
                      <div key={g.id}>
                        <p className="mb-3 text-sm font-medium text-muted-foreground">
                          Группа {g.name}
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                          {g.assignments.map((a) => (
                            <JournalCard key={a.id} a={a} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                ) : !selectedGroupId ? (
                  <motion.div
                    key="groups-grid"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  >
                    {groups.map((g) => (
                      <motion.button
                        key={g.id}
                        onClick={() => setSelectedGroupId(g.id)}
                        className="flex flex-col gap-1 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-muted hover:shadow-md"
                        whileHover={{ y: -4 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center gap-2">
                          <IconUsers
                            size={16}
                            className="shrink-0 text-muted-foreground"
                          />
                          <p className="font-medium leading-tight">
                            {g.name} <span className="text-xs font-normal text-muted-foreground">({formatCourse(g.name)})</span>
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {g.assignments.length} предметов
                        </p>
                      </motion.button>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key="subjects-grid"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedGroupId(null)}
                        className="-ml-2 h-8 gap-1 px-2"
                      >
                        <IconChevronLeft size={16} />
                        Назад
                      </Button>
                      <h2 className="font-medium">Группа {currentGroup?.name}</h2>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {currentGroup?.assignments.map((a) => (
                        <JournalCard key={a.id} a={a} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {data && data.totalPages > 1 && (
          <Suspense>
            <DataPagination
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
              limit={data.limit}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}

function JournalCard({ a }: { a: Assignment }) {
  return (
    <Link
      href={`/admin/journals/${a.id}`}
      className="group flex flex-col gap-1 rounded-lg border bg-card p-4 transition-colors hover:bg-muted"
    >
      <div className="flex items-start gap-2">
        <IconNotebook
          size={14}
          className="mt-0.5 shrink-0 text-muted-foreground"
        />
        <p className="min-w-0 font-medium leading-tight break-words" title={a.subject.name}>
          {a.subject.name}
        </p>
      </div>
      <p className="max-w-full truncate text-sm text-muted-foreground" title={a.teachers.map((t) => t.name).join(", ")}>
        {a.teachers.map((t) => shortName(t.name)).join(", ")}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {a.lessons.length} уроков
      </p>
    </Link>
  );
}

export function AdminJournalsView(props: AdminJournalsViewProps) {
  return (
    <Suspense>
      <AdminJournalsViewInner {...props} />
    </Suspense>
  );
}
