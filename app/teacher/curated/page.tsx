import { redirect } from "next/navigation";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/prisma-client";
import Link from "next/link";
import { IconNotebook } from "@tabler/icons-react";
import { shortName } from "@/lib/utils";

export default async function CuratedGroupsPage() {
  const user = await requireRole(Role.TEACHER, Role.ADMIN);
  if (!user) redirect("/login");

  const groups = await prisma.group.findMany({
    where: { curatorId: user.id },
    include: {
      assignments: {
        include: {
          subject: true,
          teachers: { select: { name: true } },
          lessons: { select: { id: true } },
        },
      },
    },
  });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Курируемые группы</h1>

      {groups.length === 0 ? (
        <p className="mt-5 text-muted-foreground">
          Вы не являетесь куратором ни одной группы.
        </p>
      ) : (
        <div className="mt-5 flex flex-col gap-8">
          {groups.map((g) => (
            <div key={g.id}>
              <p className="mb-3 text-sm font-medium text-muted-foreground">
                Группа {g.name}
              </p>
              {g.assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Нет журналов.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {g.assignments.map((a) => {
                    const href =
                      user.role === Role.ADMIN
                        ? `/teacher/journal/${a.id}`
                        : `/teacher/journal/${a.id}?readonly=1`;
                    return (
                      <Link
                        key={a.id}
                        href={href}
                        className="flex flex-col gap-1 rounded-lg border bg-card p-4 opacity-75 transition-colors hover:bg-muted"
                      >
                        <div className="flex items-center gap-2">
                          <IconNotebook
                            size={14}
                            className="shrink-0 text-muted-foreground"
                          />
                          <p className="font-medium leading-tight">
                            {a.subject.name}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {a.teachers.map((t) => shortName(t.name)).join(", ")}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {a.lessons.length} уроков
                          {user.role !== Role.ADMIN && " · только просмотр"}
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
