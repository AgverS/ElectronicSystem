"use client";

import {
  IconTrophy,
  IconAlertTriangle,
  IconClock,
  IconCircleCheck,
  IconStar,
  IconMoodAngry,
} from "@tabler/icons-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/page-state";
import { prisma } from "@/lib/prisma";
import { RecordKind } from "@/lib/prisma-client";
import { useDemoUser } from "@/lib/demo-session";
import { useDemoData } from "@/lib/use-demo-data";
import { useT } from "@/lib/i18n/provider";
import { isPenaltyExpired, isPenaltyWrittenOff } from "@/lib/records";
import { ABSENT } from "@/lib/grades";
import { cn } from "@/lib/utils";

/** A rating is only meaningful once there are enough marks behind it. */
const MIN_GRADES_FOR_RATING = 5;
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

export default function StudentProfilePage() {
  const user = useDemoUser();
  const t = useT();

  const { data, loading } = useDemoData(
    ["student-profile", user?.id, user?.groupId],
    async () => {
      const group = user?.groupId
        ? await prisma.group.findUnique({ where: { id: user.groupId } })
        : null;

      const grades = await prisma.grade.findMany({
        where: { studentId: user?.id },
        include: { lesson: true },
      });

      const numericGrades = grades
        .filter((g) => g.value !== ABSENT && g.value !== "")
        .map((g) => Number(g.value))
        .filter((n) => !isNaN(n));

      const averageGrade = numericGrades.length
        ? numericGrades.reduce((a, b) => a + b, 0) / numericGrades.length
        : 0;

      const now = new Date();
      const totalAbsences = grades.filter((g) => g.value === ABSENT).length;
      const monthAbsences = grades.filter((g) => {
        if (g.value !== ABSENT) return false;
        const d = new Date(g.lesson.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length;

      const records = await prisma.studentRecord.findMany({
        where: { studentId: user?.id },
        select: { kind: true, date: true, writtenOffAt: true },
      });
      const rewards = records.filter((r) => r.kind === RecordKind.REWARD).length;
      const penalties = records.filter(
        (r) =>
          r.kind === RecordKind.PENALTY && !isPenaltyExpired(r, now) && !isPenaltyWrittenOff(r),
      ).length;

      const labAssignments = await prisma.assignment.findMany({
        where: { groupId: user?.groupId ?? "" },
        include: {
          lessons: {
            where: {
              OR: [{ type: "lab" }, { assignment: { subject: { isPractical: true } } }],
            },
            include: { grades: { where: { studentId: user?.id } } },
          },
        },
      });

      let totalLabs = 0;
      let passedLabs = 0;
      let overdueLabs = 0;
      const cutoff = new Date(now.getTime() - TWO_WEEKS_MS);

      for (const assignment of labAssignments) {
        for (const lesson of assignment.lessons) {
          totalLabs += 1;
          const value = lesson.grades[0]?.value ?? "";
          if (parseInt(value, 10) >= 3) passedLabs += 1;
          else if (!value && new Date(lesson.date) < cutoff) overdueLabs += 1;
        }
      }

      const labCompletionRate = totalLabs > 0 ? (passedLabs / totalLabs) * 100 : 0;

      const rating = Math.max(
        0,
        Math.min(
          100,
          averageGrade * 7 +
            labCompletionRate * 0.2 -
            totalAbsences * 1.5 +
            rewards * 3 -
            penalties * 4 +
            5,
        ),
      );

      return {
        group,
        averageGrade,
        totalAbsences,
        monthAbsences,
        rewards,
        penalties,
        totalLabs,
        passedLabs,
        overdueLabs,
        labCompletionRate,
        rating,
        hasEnoughData: numericGrades.length >= MIN_GRADES_FOR_RATING,
      };
    },
    { enabled: !!user },
  );

  if (loading || !data) return <PageLoading />;

  const {
    group,
    averageGrade,
    totalAbsences,
    monthAbsences,
    rewards,
    penalties,
    totalLabs,
    passedLabs,
    overdueLabs,
    labCompletionRate,
    rating,
    hasEnoughData,
  } = data;

  const ratingColor =
    rating >= 85
      ? "text-blue-600 dark:text-blue-400"
      : rating >= 70
        ? "text-green-600 dark:text-green-400"
        : rating >= 50
          ? "text-yellow-600 dark:text-yellow-400"
          : "text-red-600 dark:text-red-400";

  const ratingBand =
    rating >= 95
      ? "elite"
      : rating >= 85
        ? "excellent"
        : rating >= 70
          ? "good"
          : rating >= 50
            ? "fair"
            : rating >= 30
              ? "needsWork"
              : "poor";

  const showOverdueNotice = overdueLabs > 0;
  const showLowAverageNotice = averageGrade > 0 && averageGrade < 4;
  const showPraiseNotice = hasEnoughData && rating >= 85;
  const showAnalysis = showOverdueNotice || showLowAverageNotice || showPraiseNotice;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">{user?.name}</h1>
        <p className="text-muted-foreground">
          {t("term.group")}: {group?.name || t("common.none")}
        </p>
      </div>

      <Card className="overflow-hidden border-2 border-primary/20 pt-0">
        <CardHeader className="py-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <IconTrophy className="text-yellow-500" />
            {t("student.profile.rating")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-8">
          {hasEnoughData ? (
            <>
              <div className={cn("text-7xl font-black tabular-nums", ratingColor)}>
                {rating.toFixed(1)}
              </div>
              <p className="mt-2 text-xl font-semibold uppercase tracking-wider text-muted-foreground">
                {t(`student.profile.band.${ratingBand}`)}
              </p>
              <div className="mt-6 w-full max-w-md overflow-hidden rounded-full bg-muted">
                <div
                  className="h-3 bg-primary transition-all duration-1000 motion-reduce:transition-none"
                  style={{ width: `${rating}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <div className="text-6xl font-black text-muted-foreground/40">—</div>
              <p className="mt-3 max-w-sm text-center text-sm text-muted-foreground text-pretty">
                {t("student.profile.notEnoughData")}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("term.average")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums">{averageGrade.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{t("student.profile.averageHint")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("term.absences")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div
                className={cn(
                  "text-3xl font-bold tabular-nums",
                  totalAbsences > 5 && "text-orange-500",
                )}
              >
                {totalAbsences}
              </div>
              <span className="text-sm text-muted-foreground">{t("term.lessons")}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t("student.profile.absencesHint")}</p>
            <div className="mt-2 flex items-baseline gap-1">
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  monthAbsences > 3 ? "text-red-500" : "text-muted-foreground",
                )}
              >
                {monthAbsences}
              </span>
              <span className="text-xs text-muted-foreground">
                {t("student.profile.thisMonth")}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("nav.records")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <IconStar size={18} className="text-yellow-500" />
                <span className="text-2xl font-bold tabular-nums text-yellow-600 dark:text-yellow-400">
                  {rewards}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <IconMoodAngry size={18} className="text-red-500" />
                <span className="text-2xl font-bold tabular-nums text-red-600 dark:text-red-400">
                  {penalties}
                </span>
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("student.profile.ratingEffect", {
                plus: rewards * 3,
                minus: penalties * 4,
              })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("nav.labs")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold tabular-nums">
                {passedLabs} / {totalLabs}
              </div>
              <div className="text-sm font-semibold text-green-600 tabular-nums">
                {labCompletionRate.toFixed(0)}%
              </div>
            </div>
            {overdueLabs > 0 && (
              <div className="mt-2 flex items-center gap-1 text-xs font-medium text-red-600">
                <IconAlertTriangle size={14} />
                {t("student.profile.overdueCount", { count: overdueLabs })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showAnalysis && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">{t("student.profile.analysis")}</h2>
          <div className="grid gap-3">
            {showOverdueNotice && (
              <Notice
                tone="red"
                Icon={IconClock}
                title={t("student.profile.notice.overdue.title", { count: overdueLabs })}
                body={t("student.profile.notice.overdue.body")}
              />
            )}
            {showLowAverageNotice && (
              <Notice
                tone="yellow"
                Icon={IconAlertTriangle}
                title={t("student.profile.notice.lowAverage.title")}
                body={t("student.profile.notice.lowAverage.body")}
              />
            )}
            {showPraiseNotice && (
              <Notice
                tone="blue"
                Icon={IconCircleCheck}
                title={t("student.profile.notice.praise.title")}
                body={t("student.profile.notice.praise.body")}
              />
            )}
          </div>
        </section>
      )}
    </div>
  );
}

const NOTICE_TONES = {
  red: "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400",
  yellow:
    "border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-900/50 dark:bg-yellow-900/20 dark:text-yellow-400",
  blue: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-400",
};

function Notice({
  tone,
  Icon,
  title,
  body,
}: {
  tone: keyof typeof NOTICE_TONES;
  Icon: React.ElementType;
  title: string;
  body: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 rounded-lg border p-4", NOTICE_TONES[tone])}>
      <Icon className="shrink-0" />
      <div>
        <p className="font-bold">{title}</p>
        <p className="text-sm">{body}</p>
      </div>
    </div>
  );
}
