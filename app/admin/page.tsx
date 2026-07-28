import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/prisma-client";
import Link from "next/link";
import { IconArrowRight, IconArrowUpRight, IconArrowDownRight } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { AnimatedStat } from "@/components/admin/animated-stat";
import { Sparkline, TrendChart, AbsenceHeatmap } from "@/components/admin/overview-charts";

const DAY = 86_400_000;
const WEEKS = 8;

const ACTION_LABEL: Record<string, string> = {
  LOGIN: "Вход",
  LOGOUT: "Выход",
  CREATE_USER: "Создание польз.",
  UPDATE_USER: "Изм. польз.",
  DELETE_USER: "Удал. польз.",
  CREATE_GROUP: "Создание группы",
  UPDATE_GROUP: "Изм. группы",
  DELETE_GROUP: "Удал. группы",
  CREATE_SUBJECT: "Создание предм.",
  UPDATE_SUBJECT: "Изм. предм.",
  DELETE_SUBJECT: "Удал. предм.",
  CREATE_SEMESTER: "Создание семестра",
  UPDATE_SEMESTER: "Изм. семестра",
  DELETE_SEMESTER: "Удал. семестра",
  CREATE_ASSIGNMENT: "Создание назнач.",
  DELETE_ASSIGNMENT: "Удал. назнач.",
  CREATE_LESSON: "Создание урока",
  DELETE_LESSON: "Удал. урока",
  UPDATE_LESSON_TOPIC: "Изм. темы урока",
  UPSERT_GRADE: "Отметка",
  DELETE_GRADE: "Удал. отметки",
  ADD_STUDENT_TO_GROUP: "Студент в группу",
  UPSERT_SCHEDULE_ENTRY: "Изм. расписания",
  DELETE_SCHEDULE_ENTRY: "Удал. расписания",
  UPSERT_SUBSTITUTION: "Замена",
  DELETE_SUBSTITUTION: "Удал. замены",
  SET_ABSENCE_EXCUSED: "Уваж. причина",
  SAVE_LATENESS: "Опоздание",
  SET_SUBJECT_HOURS: "Часы предм.",
  SET_LABS_TOTAL: "Кол-во лаб.",
  SET_LAB_DEADLINE: "Дедлайн лаб.",
  ADD_RETAKE: "Пересдача",
  RESET_PASSWORD: "Сброс пароля",
  SAVE_BELL_TIMES: "Звонки (пост.)",
  CREATE_BELL_OVERRIDE: "Создание звонков",
  UPDATE_BELL_OVERRIDE: "Изм. звонков",
  DELETE_BELL_OVERRIDE: "Удал. звонков",
  CREATE_BACKUP: "Создание бэкапа",
  DELETE_BACKUP: "Удаление бэкапа",
  RESTORE_BACKUP: "Восст. бэкапа",
  UPDATE_BACKUP_SETTINGS: "Настр. бэкапа",
  CREATE_SPECIALTY: "Создание спец.",
  UPDATE_SPECIALTY: "Изм. спец.",
  DELETE_SPECIALTY: "Удал. спец.",
  CREATE_STUDENT_RECORD: "Создание приказа",
  UPDATE_STUDENT_RECORD: "Изм. приказа",
  DELETE_STUDENT_RECORD: "Удал. приказа",
  WRITE_OFF_STUDENT_RECORD: "Списание взыскания",
  CANCEL_RECORD_WRITE_OFF: "Отмена списания",
  DELETE_RECORD_ATTACHMENT: "Удал. вложения",
};

function startOfUTCDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function formatRelative(d: Date, now: Date): string {
  const minutes = Math.floor((now.getTime() - d.getTime()) / 60_000);
  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин. назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч. назад`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} дн. назад`;
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(d);
}

function formatShortDate(d: Date): string {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(d);
}

type AbsRow = { lesson: { date: Date; assignment: { groupId: string } } };

interface OverviewData {
  students: number;
  teachers: number;
  groups: number;
  subjects: number;
  attPct: number | null;
  attDelta: number | null;
  absWeek: number;
  absDelta: number;
  avgGrade: number | null;
  absByWeek: number[];
  heat: { groups: string[]; days: string[]; matrix: number[][] };
  records: { id: string; kind: "REWARD" | "PENALTY"; reason: string; studentName: string; date: Date }[];
  semesters: { id: string; name: string; startDate: Date; endDate: Date }[];
  logs: { id: string; action: string; name: string; username: string | null; createdAt: Date }[];
}

async function loadOverview(now: Date): Promise<OverviewData> {
  const today = startOfUTCDay(now);
  const weekAgo = new Date(today.getTime() - 7 * DAY);
  const twoWeekAgo = new Date(today.getTime() - 14 * DAY);
  const monthAgo = new Date(today.getTime() - 30 * DAY);
  const trendStart = new Date(today.getTime() - WEEKS * 7 * DAY);
  const heatStart = new Date(today.getTime() - 13 * DAY);

  const [
    byRole,
    groups,
    subjectCount,
    absWeek,
    prevAbsWeek,
    marksWeek,
    prevMarksWeek,
    avgRows,
    absRows,
    records,
    semesters,
    logs,
  ] = await Promise.all([
    prisma.user.groupBy({ by: ["role"], where: { isMaster: false }, _count: true }),
    prisma.group.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.subject.count(),
    prisma.grade.count({ where: { value: "Н", lesson: { date: { gte: weekAgo } } } }),
    prisma.grade.count({ where: { value: "Н", lesson: { date: { gte: twoWeekAgo, lt: weekAgo } } } }),
    prisma.grade.count({ where: { lesson: { date: { gte: weekAgo } } } }),
    prisma.grade.count({ where: { lesson: { date: { gte: twoWeekAgo, lt: weekAgo } } } }),
    prisma.grade.findMany({
      where: { value: { in: ["2", "3", "4", "5"] }, lesson: { date: { gte: monthAgo } } },
      select: { value: true },
    }),
    prisma.grade.findMany({
      where: { value: "Н", lesson: { date: { gte: trendStart } } },
      select: { lesson: { select: { date: true, assignment: { select: { groupId: true } } } } },
    }),
    prisma.studentRecord.findMany({
      orderBy: { date: "desc" },
      take: 6,
      select: { id: true, kind: true, reason: true, date: true, student: { select: { name: true } } },
    }),
    prisma.semester.findMany({ orderBy: [{ year: "desc" }, { number: "desc" }], take: 6 }),
    prisma.auditLog.findMany({
      where: { user: { isMaster: false } },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { user: { select: { name: true, username: true } } },
    }),
  ]);

  const roleCount = Object.fromEntries(byRole.map((r) => [r.role, r._count]));
  const groupName = new Map(groups.map((g) => [g.id, g.name]));

  const attPct = marksWeek > 0 ? Math.round(100 * (1 - absWeek / marksWeek)) : null;
  const prevAttPct = prevMarksWeek > 0 ? Math.round(100 * (1 - prevAbsWeek / prevMarksWeek)) : null;
  const attDelta = attPct !== null && prevAttPct !== null ? attPct - prevAttPct : null;

  const avgGrade =
    avgRows.length > 0
      ? avgRows.reduce((s, g) => s + Number(g.value), 0) / avgRows.length
      : null;

  // Пропуски по неделям (тренд + спарклайн)
  const absByWeek = new Array(WEEKS).fill(0);
  for (const r of absRows as AbsRow[]) {
    const idx = Math.floor((startOfUTCDay(r.lesson.date).getTime() - trendStart.getTime()) / (7 * DAY));
    if (idx >= 0 && idx < WEEKS) absByWeek[idx] += 1;
  }

  // Тепловая карта группа × день (последние 10 учебных дней)
  const dayKeys = new Set<number>();
  const perGroupDay = new Map<string, Map<number, number>>();
  const groupTotals = new Map<string, number>();
  for (const r of absRows as AbsRow[]) {
    const dd = startOfUTCDay(r.lesson.date);
    if (dd < heatStart) continue;
    const dk = dd.getTime();
    const gid = r.lesson.assignment.groupId;
    dayKeys.add(dk);
    if (!perGroupDay.has(gid)) perGroupDay.set(gid, new Map());
    const m = perGroupDay.get(gid)!;
    m.set(dk, (m.get(dk) ?? 0) + 1);
    groupTotals.set(gid, (groupTotals.get(gid) ?? 0) + 1);
  }
  const dayList = [...dayKeys].sort((a, b) => a - b).slice(-10);
  const topGroups = [...groupTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([gid]) => gid);
  const heat = {
    groups: topGroups.map((gid) => groupName.get(gid) ?? "—"),
    days: dayList.map((t) => String(new Date(t).getUTCDate())),
    matrix: topGroups.map((gid) => dayList.map((t) => perGroupDay.get(gid)?.get(t) ?? 0)),
  };

  return {
    students: roleCount[Role.STUDENT] ?? 0,
    teachers: (roleCount[Role.TEACHER] ?? 0) + (roleCount[Role.ADMIN] ?? 0),
    groups: groups.length,
    subjects: subjectCount,
    attPct,
    attDelta,
    absWeek,
    absDelta: absWeek - prevAbsWeek,
    avgGrade,
    absByWeek,
    heat,
    records: records.map((r) => ({
      id: r.id,
      kind: r.kind,
      reason: r.reason,
      studentName: r.student.name,
      date: r.date,
    })),
    semesters,
    logs: logs.map((l) => ({
      id: l.id,
      action: l.action,
      name: l.user.name,
      username: l.user.username,
      createdAt: l.createdAt,
    })),
  };
}

const EMPTY: OverviewData = {
  students: 0, teachers: 0, groups: 0, subjects: 0,
  attPct: null, attDelta: null, absWeek: 0, absDelta: 0, avgGrade: null,
  absByWeek: new Array(WEEKS).fill(0),
  heat: { groups: [], days: [], matrix: [] },
  records: [], semesters: [], logs: [],
};

export default async function AdminDashboard() {
  const now = new Date();
  const today = startOfUTCDay(now);
  const d = await loadOverview(now).catch(() => EMPTY);

  const weekLabels = Array.from({ length: WEEKS }, (_, i) =>
    i === WEEKS - 1 ? "сейчас" : `${WEEKS - 1 - i}н`,
  );
  const dateLabel = new Intl.DateTimeFormat("ru-RU", {
    weekday: "long", day: "numeric", month: "long",
  }).format(now);

  const currentSem =
    d.semesters.find((s) => today >= startOfUTCDay(new Date(s.startDate)) && today <= startOfUTCDay(new Date(s.endDate))) ??
    null;
  let semProgress = 0;
  if (currentSem) {
    const s = new Date(currentSem.startDate).getTime();
    const e = new Date(currentSem.endDate).getTime();
    semProgress = Math.min(100, Math.max(0, Math.round(((today.getTime() - s) / (e - s)) * 100)));
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="font-mono text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {dateLabel}
        </p>
        <h1 className="mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl">Обзор</h1>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* KPI ROW */}
        <Kpi className="col-span-6 lg:col-span-3" label="Посещаемость · нед"
          value={d.attPct === null ? "—" : <AnimatedStat value={d.attPct} />} unit={d.attPct === null ? "" : "%"}
          delta={d.attDelta === null ? null : { good: d.attDelta >= 0, text: `${d.attDelta >= 0 ? "+" : ""}${d.attDelta}% за неделю` }} />
        <Kpi className="col-span-6 lg:col-span-3" label="Пропусков за неделю"
          value={<AnimatedStat value={d.absWeek} />}
          delta={d.absDelta === 0 ? { good: true, text: "без изменений" } : { good: d.absDelta < 0, text: `${d.absDelta < 0 ? "−" : "+"}${Math.abs(d.absDelta)} к прошлой` }}
          spark={{ points: d.absByWeek, tone: "neg" }} />
        <Kpi className="col-span-6 lg:col-span-3" label="Активных групп"
          value={<AnimatedStat value={d.groups} />} />
        <Kpi className="col-span-6 lg:col-span-3" label="Средний балл · 30 дн"
          value={d.avgGrade === null ? "—" : d.avgGrade.toFixed(1)} />

        {/* TREND + SEMESTER */}
        <section className="col-span-12 rounded-xl border bg-card p-5 shadow-xs lg:col-span-8">
          <h2 className="flex items-center text-sm font-semibold text-muted-foreground">
            Пропуски · {WEEKS} недель
            <span className="ml-auto text-xs font-medium text-muted-foreground/70">по всем группам</span>
          </h2>
          <div className="mt-3">
            <TrendChart series={d.absByWeek} labels={weekLabels} />
          </div>
        </section>

        <section className="col-span-12 flex flex-col rounded-xl border bg-card p-5 shadow-xs lg:col-span-4">
          <h2 className="text-sm font-semibold text-muted-foreground">Текущий семестр</h2>
          {currentSem ? (
            <div className="mt-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{currentSem.name}</span>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 animate-pulse-ring">
                  Активный
                </span>
              </div>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                {formatShortDate(new Date(currentSem.startDate))} — {formatShortDate(new Date(currentSem.endDate))} · {semProgress}%
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary animate-progress" style={{ width: `${semProgress}%` }} />
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Нет активного семестра</p>
          )}
          <div className="mt-auto grid grid-cols-2 gap-x-4 gap-y-3 pt-5">
            <QuickStat label="Студентов" value={d.students} />
            <QuickStat label="Преподавателей" value={d.teachers} />
            <QuickStat label="Групп" value={d.groups} />
            <QuickStat label="Предметов" value={d.subjects} />
          </div>
        </section>

        {/* HEATMAP + RECORDS */}
        <section className="col-span-12 overflow-hidden rounded-xl border bg-card p-5 shadow-xs lg:col-span-8">
          <h2 className="flex items-center text-sm font-semibold text-muted-foreground">
            Пропуски по группам · последние дни
            <span className="ml-auto text-xs font-medium text-muted-foreground/70">наведите на ячейку</span>
          </h2>
          {d.heat.groups.length > 0 ? (
            <div className="overflow-x-auto">
              <AbsenceHeatmap groups={d.heat.groups} days={d.heat.days} matrix={d.heat.matrix} />
            </div>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">Нет данных о пропусках за период</p>
          )}
        </section>

        <section className="col-span-12 flex flex-col rounded-xl border bg-card p-5 shadow-xs lg:col-span-4">
          <h2 className="flex items-center text-sm font-semibold text-muted-foreground">
            Последние записи
            <Link href="/admin/records" className="ml-auto flex items-center gap-1 text-xs font-medium transition-colors hover:text-foreground">
              все <IconArrowRight size={12} />
            </Link>
          </h2>
          <div className="mt-1">
            {d.records.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">Нет записей</p>
            ) : (
              d.records.map((r) => (
                <div key={r.id} className="flex gap-3 border-b py-2.5 last:border-none">
                  <span className={`grid size-7 shrink-0 place-items-center rounded-md text-sm font-bold ${r.kind === "REWARD" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-destructive/15 text-destructive"}`}>
                    {r.kind === "REWARD" ? "+" : "−"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {r.kind === "REWARD" ? "Поощрение" : "Взыскание"} · {r.studentName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{r.reason}</p>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground/70">
                    {formatShortDate(new Date(r.date))}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ACTIVITY */}
        <section className="col-span-12 rounded-xl border bg-card shadow-xs">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="text-sm font-semibold text-muted-foreground">Последние действия</h2>
            <Link href="/admin/logs" className="flex items-center gap-1 text-xs font-medium transition-colors hover:text-foreground">
              Все записи <IconArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y">
            {d.logs.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">Нет записей</p>
            ) : (
              d.logs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium leading-none">{log.name}</span>
                      <Badge variant="outline">{ACTION_LABEL[log.action] ?? log.action}</Badge>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">{log.username ?? "—"}</span>
                  </div>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground/70">{formatRelative(log.createdAt, now)}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Kpi({
  className, label, value, unit, delta, spark,
}: {
  className?: string;
  label: string;
  value: React.ReactNode;
  unit?: string;
  delta?: { good: boolean; text: string } | null;
  spark?: { points: number[]; tone: "pos" | "neg" | "accent" | "muted" };
}) {
  return (
    <div className={`relative flex flex-col gap-2.5 overflow-hidden rounded-xl border bg-card p-5 shadow-xs ${className ?? ""}`}>
      <span className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="font-mono text-[34px] font-bold leading-none tracking-tight tabular-nums">
        {value}{unit && <span className="text-lg font-semibold text-muted-foreground">{unit}</span>}
      </div>
      {delta && (
        <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${delta.good ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400" : "bg-destructive/12 text-destructive"}`}>
          {delta.good ? <IconArrowUpRight size={13} /> : <IconArrowDownRight size={13} />}
          {delta.text}
        </span>
      )}
      {spark && (
        // Только на десктопе — на мобилке карточка узкая и лайн наезжает на бейдж.
        <div className="absolute bottom-4 right-4 hidden opacity-90 sm:block">
          <Sparkline points={spark.points} tone={spark.tone} />
        </div>
      )}
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-mono text-xl font-bold tabular-nums">
        <AnimatedStat value={value} />
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
