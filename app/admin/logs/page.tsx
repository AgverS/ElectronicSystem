import { prisma } from "@/lib/prisma";
import { Suspense } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LogsFilters } from "@/components/admin/logs-filters";
import { MetaButton } from "@/components/admin/meta-button";
import { Prisma } from "@/lib/prisma-client";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

const ACTION_CONFIG: Record<string, { label: string; className: string }> = {
  LOGIN: {
    label: "Вход",
    className: "bg-green-500/10 text-green-600 border-green-500/20",
  },
  LOGOUT: {
    label: "Выход",
    className: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  },
  CREATE_USER: {
    label: "Создание польз.",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  UPDATE_USER: {
    label: "Изм. польз.",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  DELETE_USER: {
    label: "Удал. польз.",
    className: "bg-red-500/10 text-red-600 border-red-500/20",
  },
  CREATE_GROUP: {
    label: "Создание группы",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  UPDATE_GROUP: {
    label: "Изм. группы",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  DELETE_GROUP: {
    label: "Удал. группы",
    className: "bg-red-500/10 text-red-600 border-red-500/20",
  },
  CREATE_SUBJECT: {
    label: "Создание предм.",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  UPDATE_SUBJECT: {
    label: "Изм. предм.",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  DELETE_SUBJECT: {
    label: "Удал. предм.",
    className: "bg-red-500/10 text-red-600 border-red-500/20",
  },
  CREATE_SPECIALTY: {
    label: "Создание спец.",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  UPDATE_SPECIALTY: {
    label: "Изм. спец.",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  DELETE_SPECIALTY: {
    label: "Удал. спец.",
    className: "bg-red-500/10 text-red-600 border-red-500/20",
  },
  CREATE_SEMESTER: {
    label: "Создание семестра",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  UPDATE_SEMESTER: {
    label: "Изм. семестра",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  DELETE_SEMESTER: {
    label: "Удал. семестра",
    className: "bg-red-500/10 text-red-600 border-red-500/20",
  },
  CREATE_ASSIGNMENT: {
    label: "Создание назнач.",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  DELETE_ASSIGNMENT: {
    label: "Удал. назнач.",
    className: "bg-red-500/10 text-red-600 border-red-500/20",
  },
  CREATE_LESSON: {
    label: "Создание урока",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  DELETE_LESSON: {
    label: "Удал. урока",
    className: "bg-red-500/10 text-red-600 border-red-500/20",
  },
  UPDATE_LESSON_TOPIC: {
    label: "Изм. темы урока",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  UPSERT_GRADE: {
    label: "Отметка",
    className: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  },
  DELETE_GRADE: {
    label: "Удал. отметки",
    className: "bg-red-500/10 text-red-600 border-red-500/20",
  },
  ADD_STUDENT_TO_GROUP: {
    label: "Студент в группу",
    className: "bg-teal-500/10 text-teal-600 border-teal-500/20",
  },
  UPSERT_SCHEDULE_ENTRY: {
    label: "Изм. расписания",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  DELETE_SCHEDULE_ENTRY: {
    label: "Удал. расписания",
    className: "bg-red-500/10 text-red-600 border-red-500/20",
  },
  UPSERT_SUBSTITUTION: {
    label: "Замена",
    className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  },
  DELETE_SUBSTITUTION: {
    label: "Удал. замены",
    className: "bg-red-500/10 text-red-600 border-red-500/20",
  },
  SET_ABSENCE_EXCUSED: {
    label: "Уваж. причина",
    className: "bg-teal-500/10 text-teal-600 border-teal-500/20",
  },
  SAVE_LATENESS: {
    label: "Опоздание",
    className: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  },
  SET_SUBJECT_HOURS: {
    label: "Часы предм.",
    className: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  },
  SET_LABS_TOTAL: {
    label: "Кол-во лаб.",
    className: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  },
  SET_LAB_DEADLINE: {
    label: "Дедлайн лаб.",
    className: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  },
  ADD_RETAKE: {
    label: "Пересдача",
    className: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  },
  RESET_PASSWORD: {
    label: "Сброс пароля",
    className: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  },
  SAVE_BELL_TIMES: {
    label: "Звонки (пост.)",
    className: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  },
  CREATE_BELL_OVERRIDE: {
    label: "Создание звонков",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  UPDATE_BELL_OVERRIDE: {
    label: "Изм. звонков",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  DELETE_BELL_OVERRIDE: {
    label: "Удал. звонков",
    className: "bg-red-500/10 text-red-600 border-red-500/20",
  },
  CREATE_BACKUP: {
    label: "Создание бэкапа",
    className: "bg-green-500/10 text-green-600 border-green-500/20",
  },
  DELETE_BACKUP: {
    label: "Удаление бэкапа",
    className: "bg-red-500/10 text-red-600 border-red-500/20",
  },
  RESTORE_BACKUP: {
    label: "Восст. бэкапа",
    className: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  },
  UPDATE_BACKUP_SETTINGS: {
    label: "Настр. бэкапа",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  CREATE_STUDENT_RECORD: {
    label: "Создание приказа",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  UPDATE_STUDENT_RECORD: {
    label: "Изм. приказа",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  DELETE_STUDENT_RECORD: {
    label: "Удал. приказа",
    className: "bg-red-500/10 text-red-600 border-red-500/20",
  },
  WRITE_OFF_STUDENT_RECORD: {
    label: "Списание взыскания",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  CANCEL_RECORD_WRITE_OFF: {
    label: "Отмена списания",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  DELETE_RECORD_ATTACHMENT: {
    label: "Удал. вложения",
    className: "bg-red-500/10 text-red-600 border-red-500/20",
  },
};

const ENTITY_LABELS: Record<string, string> = {
  session: "Сессия",
  user: "Пользователь",
  group: "Группа",
  subject: "Предмет",
  semester: "Семестр",
  assignment: "Назначение",
  lesson: "Урок",
  grade: "Отметка",
  schedule_entry: "Расписание",
  schedule_substitution: "Замена",
  excused_absence: "Уваж. причина",
  specialty: "Специальность",
  bell_time: "Звонки",
  bell_override: "Звонки (искл.)",
  backup: "Бэкап",
  backup_setting: "Настр. бэкапа",
  student_record: "Приказ",
  record_attachment: "Вложение",
};

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(d);
}

function buildWhere(
  action: string,
  entity: string,
  search: string,
  dateFrom: string,
  dateTo: string,
): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {
    user: { isMaster: false },
  };

  if (action) where.action = action;
  if (entity) where.entity = entity;

  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo + "T23:59:59.999Z") } : {}),
    };
  }

  if (search) {
    where.OR = [
      { user: { name: { contains: search, mode: "insensitive" } } },
      { user: { username: { contains: search, mode: "insensitive" } } },
      { ipAddress: { contains: search } },
      { entityId: { contains: search, mode: "insensitive" } },
    ];
  }

  return where;
}

function buildPageUrl(current: URLSearchParams, page: number) {
  const p = new URLSearchParams(current.toString());
  p.set("page", String(page));
  return `/admin/logs?${p.toString()}`;
}

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[]>>;
}) {
  const params = await searchParams;

  const action = String(params.action ?? "");
  const entity = String(params.entity ?? "");
  const search = String(params.search ?? "");
  const dateFrom = String(params.dateFrom ?? "");
  const dateTo = String(params.dateTo ?? "");
  const page = Math.max(1, parseInt(String(params.page ?? "1"), 10) || 1);
  const limit = Math.min(
    100,
    Math.max(10, parseInt(String(params.limit ?? "50"), 10) || 50),
  );

  const skip = (page - 1) * limit;
  const where = buildWhere(action, entity, search, dateFrom, dateTo);

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: { user: { select: { name: true, username: true, role: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentParams = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Журнал действий</h1>
          <p className="text-sm text-muted-foreground">
            {total.toLocaleString("ru-RU")} записей
          </p>
        </div>
      </div>

      <Suspense>
        <LogsFilters />
      </Suspense>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-36">Время</TableHead>
              <TableHead className="w-44">Пользователь</TableHead>
              <TableHead className="w-44">Действие</TableHead>
              <TableHead className="w-32">Сущность</TableHead>
              <TableHead className="w-28">IP адрес</TableHead>
              <TableHead>User-Agent</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-12 text-center text-muted-foreground"
                >
                  Записей не найдено
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => {
                const cfg = ACTION_CONFIG[log.action];
                const entityLabel = ENTITY_LABELS[log.entity] ?? log.entity;
                const meta = log.meta as Record<string, unknown> | null;

                return (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {formatDate(log.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium leading-none">
                          {log.user.name}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {log.user.username}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          cfg?.className ?? "border-border text-foreground"
                        }
                      >
                        {cfg?.label ?? log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm">{entityLabel}</span>
                        {log.entityId && (
                          <span className="font-mono text-xs text-muted-foreground">
                            {log.entityId.slice(0, 8)}…
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.ipAddress ?? "-"}
                    </TableCell>
                    <TableCell
                      className="max-w-48 truncate text-xs text-muted-foreground"
                      title={log.userAgent ?? ""}
                    >
                      {log.userAgent
                        ? log.userAgent.replace(/Mozilla\/[\d.]+\s*/, "")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {meta && Object.keys(meta).length > 0 ? (
                        <MetaButton meta={meta} />
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <p className="text-muted-foreground">
          Страница {page} из {totalPages} · записи {skip + 1}–
          {Math.min(skip + limit, total)} из {total.toLocaleString("ru-RU")}
        </p>
        <div className="flex items-center gap-1">
          {page > 1 && (
            <Link
              href={buildPageUrl(currentParams, 1)}
              className="flex h-8 items-center gap-1 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <IconChevronLeft size={14} />
              <IconChevronLeft size={14} className="-ml-2.5" />
            </Link>
          )}
          {page > 1 && (
            <Link
              href={buildPageUrl(currentParams, page - 1)}
              className="flex h-8 items-center gap-1 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <IconChevronLeft size={14} />
              Назад
            </Link>
          )}

          {/* Page numbers */}
          {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
            let p: number;
            if (totalPages <= 7) {
              p = i + 1;
            } else if (page <= 4) {
              p = i + 1;
            } else if (page >= totalPages - 3) {
              p = totalPages - 6 + i;
            } else {
              p = page - 3 + i;
            }
            return (
              <Link
                key={p}
                href={buildPageUrl(currentParams, p)}
                className={`flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm transition-colors hover:bg-muted ${p === page
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground"
                  }`}
              >
                {p}
              </Link>
            );
          })}

          {page < totalPages && (
            <Link
              href={buildPageUrl(currentParams, page + 1)}
              className="flex h-8 items-center gap-1 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Вперёд
              <IconChevronRight size={14} />
            </Link>
          )}
          {page < totalPages && (
            <Link
              href={buildPageUrl(currentParams, totalPages)}
              className="flex h-8 items-center gap-1 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <IconChevronRight size={14} />
              <IconChevronRight size={14} className="-ml-2.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
