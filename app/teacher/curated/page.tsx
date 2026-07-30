"use client";

import Link from "next/link";
import { IconNotebook } from "@tabler/icons-react";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/prisma-client";
import { useDemoUser } from "@/lib/demo-session";
import { useDemoData } from "@/lib/use-demo-data";
import { useT } from "@/lib/i18n/provider";
import { PageLoading } from "@/components/ui/page-state";
import { shortName } from "@/lib/utils";

export default function CuratedGroupsPage() {
  const user = useDemoUser();
  const t = useT();

  const { data, loading } = useDemoData(
    ["curated-groups", user?.id],
    () =>
      prisma.group.findMany({
        where: { curatorId: user?.id },
        include: {
          assignments: {
            include: {
              subject: true,
              teachers: { select: { name: true } },
              lessons: { select: { id: true } },
            },
          },
        },
        orderBy: { name: "asc" },
      }),
    { enabled: !!user },
  );

  if (loading) return <PageLoading />;

  const groups = data ?? [];

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight">{t("nav.curatedGroups")}</h1>

      {groups.length === 0 ? (
        <p className="mt-5 text-muted-foreground">{t("teacher.curated.empty")}</p>
      ) : (
        <div className="mt-5 flex flex-col gap-8">
          {groups.map((g) => (
            <div key={g.id}>
              <p className="mb-3 text-sm font-medium text-muted-foreground">
                {t("term.group")} {g.name}
              </p>
              {g.assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("teacher.curated.noJournals")}</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {g.assignments.map((a) => {
                    // A curator may read the journals of their group, but only
                    // the assigned teacher (or an administrator) may edit them.
                    const href =
                      user?.role === Role.ADMIN
                        ? `/teacher/journal/?id=${a.id}`
                        : `/teacher/journal/?id=${a.id}&readonly=1`;
                    return (
                      <Link
                        key={a.id}
                        href={href}
                        className="flex flex-col gap-1 rounded-lg border bg-card p-4 opacity-75 transition-colors hover:bg-muted"
                      >
                        <div className="flex items-center gap-2">
                          <IconNotebook size={14} className="shrink-0 text-muted-foreground" />
                          <p className="font-medium leading-tight">{a.subject.name}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {a.teachers.map((teacher) => shortName(teacher.name)).join(", ")}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t("teacher.curated.lessonCount", { count: a.lessons.length })}
                          {user?.role !== Role.ADMIN && ` · ${t("teacher.curated.readOnly")}`}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
