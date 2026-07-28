"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IconEye, IconUser, IconLoader2 } from "@tabler/icons-react";
import { getUserDetailsForAdmin } from "@/lib/actions/admin";
import { Role } from "@/lib/prisma-client";
import { cn, formatSemesterName } from "@/lib/utils";

interface UserDetailsDialogProps {
  userId: string;
  userName: string;
  trigger?: React.ReactNode;
}

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Администратор",
  TEACHER: "Преподаватель",
  STUDENT: "Ученик",
};

const GRADE_COLORS: Record<string, string> = {
  Н: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  "1": "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  "2": "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  "3": "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  "4": "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  "5": "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  "6": "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  "7": "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  "8": "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  "9": "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  "10": "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
};

const RED_STYLE = "bg-red-500 text-white dark:bg-red-600 dark:text-white ring-2 ring-red-300 dark:ring-red-900";

function getGradeStyle(val: string, lessonType: string) {
  const isN = val === "Н";
  const numVal = parseInt(val);
  const isRed =
    (lessonType === "практика" && isN) ||
    ((lessonType === "лабораторная" || lessonType === "ОКР") && (isN || (!isNaN(numVal) && numVal < 3)));

  return isRed ? RED_STYLE : (GRADE_COLORS[val] ?? "bg-muted");
}

function fmtDate(d: Date | string) {
  const dateObj = typeof d === "string" ? new Date(d) : d;
  return dateObj.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

export function UserDetailsDialog({ userId, userName, trigger }: UserDetailsDialogProps) {
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-user-details", userId],
    queryFn: async () => {
      return getUserDetailsForAdmin(userId);
    },
    enabled: open,
  });

  const user = data?.user;
  const academic = data?.academic;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Просмотр подробностей"
          >
            <IconEye size={15} />
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconUser size={18} className="text-muted-foreground" />
            <span>Информация о пользователе</span>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <IconLoader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !user ? (
          <div className="py-8 text-center text-muted-foreground">
            Пользователь не найден
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Основная инфа */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border bg-muted/20 p-3 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">ФИО:</span>
                <p className="font-semibold">{user.name}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Логин:</span>
                <p className="font-mono">{user.username ?? "—"}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Роль:</span>
                <p>{ROLE_LABELS[user.role] || user.role}</p>
              </div>
              {user.role === Role.STUDENT && user.group && (
                <div>
                  <span className="text-xs text-muted-foreground">Группа:</span>
                  <p className="font-semibold">{user.group.name}</p>
                </div>
              )}
            </div>

            {/* Дополнительная инфа для преподавателя / админа */}
            {(user.role === Role.TEACHER || user.role === Role.ADMIN) && (
              <div className="flex flex-col gap-3">
                {user.specialties && user.specialties.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Специальности</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {user.specialties.map((s: any) => (
                        <span key={s.id} className="rounded bg-muted px-2 py-0.5 text-xs" title={s.name}>
                          {s.abbreviation || s.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {user.curatedGroups && user.curatedGroups.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Кураторские группы</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {user.curatedGroups.map((g: any) => (
                        <span key={g.id} className="rounded bg-muted px-2 py-0.5 text-xs font-semibold">
                          {g.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {user.subjects && user.subjects.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Преподаваемые предметы</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {user.subjects.map((s: any) => (
                        <span key={s.id} className="rounded bg-muted px-2 py-0.5 text-xs">
                          {s.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Успеваемость студента по семестрам */}
            {user.role === Role.STUDENT && (
              <div className="mt-2 flex flex-col gap-3">
                <h3 className="text-sm font-bold tracking-tight">Успеваемость по семестрам</h3>
                {!academic || academic.semesters.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    Учащийся ещё не посещал занятия и не имеет оценок в системе.
                  </p>
                ) : (
                  <Tabs defaultValue={academic.semesters[0].id} className="w-full">
                    <div className="overflow-x-auto pb-1">
                      <TabsList className="flex w-max gap-1">
                        {academic.semesters.map((sem: any) => (
                          <TabsTrigger key={sem.id} value={sem.id} className="text-xs whitespace-nowrap">
                            {formatSemesterName(sem, user.group?.name)}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </div>

                    {academic.semesters.map((sem: any) => {
                      const rows = academic.semesterData[sem.id] || [];
                      return (
                        <TabsContent key={sem.id} value={sem.id} className="mt-2">
                          <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full border-collapse text-left text-xs">
                              <thead>
                                <tr className="border-b bg-muted/50 font-mono text-[10px] uppercase text-muted-foreground">
                                  <th className="px-3 py-2 font-semibold">Предмет</th>
                                  <th className="px-3 py-2 font-semibold">Отметки</th>
                                  <th className="px-3 py-2 text-right font-semibold">Средний балл</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rows.map((row: any) => (
                                  <tr key={row.subjectId} className="border-b last:border-0 hover:bg-muted/20">
                                    <td className="px-3 py-2 font-medium whitespace-nowrap max-w-[180px] truncate" title={row.subject}>
                                      {row.subject}
                                    </td>
                                    <td className="px-3 py-2">
                                      <div className="flex flex-wrap gap-1">
                                        {row.grades.map((g: any) => (
                                          <span
                                            key={g.id}
                                            title={fmtDate(g.date) + (g.topic ? " · " + g.topic : "")}
                                            className={cn(
                                              "inline-flex h-5 min-w-5 items-center justify-center rounded px-0.5 text-[10px] font-semibold",
                                              getGradeStyle(g.value, g.type)
                                            )}
                                          >
                                            {g.value}
                                          </span>
                                        ))}
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono font-bold">
                                      {row.avg ?? "—"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </TabsContent>
                      );
                    })}
                  </Tabs>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
