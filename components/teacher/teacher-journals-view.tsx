"use client";

import { useSearchParams } from "next/navigation";
import { translate } from "@/lib/i18n/translate";
import { useQuery } from "@tanstack/react-query";
import { Suspense, useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { IconNotebook, IconUsers, IconChevronLeft } from "@tabler/icons-react";
import { TableToolbar } from "@/components/admin/table-toolbar";
import { Role } from "@/lib/prisma-client";
import { Button } from "@/components/ui/button";
import { shortName } from "@/lib/utils";

interface TeacherJournalsViewProps {
  userRole: Role;
}

type Assignment = {
  id: string;
  subject: { name: string };
  group: { id: string; name: string };
  teachers: { name: string }[];
  lessons: { id: string }[];
};

function TeacherJournalsViewInner({ userRole }: TeacherJournalsViewProps) {
  const searchParams = useSearchParams();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const { data, isFetching } = useQuery({
    queryKey: ["teacher-journals", searchParams.toString()],
    queryFn: async () => {
      const res = await fetch(
        `/api/teacher/journals?${searchParams.toString()}`,
      );
      if (!res.ok) throw new Error("Failed to fetch journals");
      return res.json() as Promise<{ data: Assignment[] }>;
    },
  });

  const search = searchParams.get("search");

  const groupedAssignments = useMemo(() => {
    const items = data?.data;
    if (!items) return {};
    return items.reduce<Record<string, { name: string; items: Assignment[] }>>(
      (acc, a) => {
        if (!acc[a.group.id]) {
          acc[a.group.id] = { name: a.group.name, items: [] };
        }
        acc[a.group.id].items.push(a);
        return acc;
      },
      {},
    );
  }, [data]);

  const groups = useMemo(() => {
    return Object.entries(groupedAssignments)
      .map(([id, { name, items }]) => ({ id, name, count: items.length }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [groupedAssignments]);

  const currentGroup = selectedGroupId ? groupedAssignments[selectedGroupId] : null;

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
      <h1 className="mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl">
        {userRole === Role.ADMIN ? translate("nav.journals") : translate("nav.myJournals")}
      </h1>
      {data?.data?.length ? (
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          {translate("journals.summaryLine", {
            groups: groups.length,
            journals: data.data.length,
            lessons: data.data.reduce((s, a) => s + a.lessons.length, 0),
          })}
        </p>
      ) : null}

      <div className="mt-5 flex flex-col gap-4">
        <Suspense>
          <TableToolbar searchPlaceholder={translate("ui.searchBySubjectOrGroup")} />
        </Suspense>

        <div
          style={{ opacity: isFetching ? 0.6 : 1 }}
          className="transition-opacity"
        >
          {!data?.data?.length ? (
            <p className="text-muted-foreground">
              {isFetching
                ? translate("common.loading")
                : translate("ui.noAssignmentsPleaseContactAnAdministrator")}
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
                    className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                  >
                    {data.data.map((a) => (
                      <JournalCard key={a.id} a={a} userRole={userRole} />
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
                        className="group/card flex flex-col gap-1.5 rounded-xl border bg-card p-4 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center gap-2">
                          <IconUsers
                            size={16}
                            className="shrink-0 text-muted-foreground transition-colors group-hover/card:text-primary"
                          />
                          <p className="font-semibold leading-tight">{g.name}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-mono font-medium text-foreground">{g.count}</span>{" "}
                          {translate("term.subjects").toLowerCase()}
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
                        {translate("common.back")}
                      </Button>
                      <h2 className="font-medium">{translate("ui.groupNamed", { name: currentGroup?.name ?? "" })}</h2>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {currentGroup?.items.map((a) => (
                        <JournalCard key={a.id} a={a} userRole={userRole} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function JournalCard({ a, userRole }: { a: Assignment; userRole: Role }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12, scale: 0.97 },
        show: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { type: "spring", stiffness: 260, damping: 22 },
        },
      }}
      whileHover={{ y: -2 }}
    >
      <Link
        href={`/teacher/journal/?id=${a.id}`}
        className="group/card flex flex-col gap-1 rounded-xl border bg-card p-4 shadow-xs transition-[border-color,box-shadow] hover:border-primary/30 hover:shadow-md"
      >
        <div className="flex items-start gap-2">
          <IconNotebook size={14} className="mt-0.5 shrink-0 text-muted-foreground transition-colors group-hover/card:text-primary" />
          <p className="min-w-0 font-semibold leading-tight break-words" title={a.subject.name}>
            {a.subject.name}
          </p>
        </div>
        <p className="max-w-full truncate text-sm text-muted-foreground" title={a.group.name}>{translate("ui.groupNamed", { name: a.group.name })}</p>
        <p className="max-w-full truncate text-xs text-muted-foreground" title={a.teachers.map((t) => t.name).join(", ")}>
          {a.teachers.map((t) => shortName(t.name)).join(", ")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          <span className="font-mono font-medium text-foreground">{a.lessons.length}</span> {translate("ui.lessons")}
        </p>
      </Link>
    </motion.div>
  );
}

export function TeacherJournalsView(props: TeacherJournalsViewProps) {
  return (
    <Suspense>
      <TeacherJournalsViewInner {...props} />
    </Suspense>
  );
}
