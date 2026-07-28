import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/prisma-client";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  IconTrophy,
  IconAlertTriangle,
  IconClock,
  IconCircleCheck,
  IconStar,
  IconMoodAngry,
} from "@tabler/icons-react";
import { RecordKind } from "@/lib/prisma-client";
import { isPenaltyExpired, isPenaltyWrittenOff } from "@/lib/records";

export default async function StudentProfilePage() {
  const user = await requireRole(Role.STUDENT, Role.ADMIN);
  if (!user) redirect("/login");

  const group = user.groupId
    ? await prisma.group.findUnique({ where: { id: user.groupId } })
    : null;

  const grades = await prisma.grade.findMany({
    where: { studentId: user.id },
    include: {
      lesson: true,
    },
  });

  const numGrades = grades
    .filter((g) => g.value !== "Н" && g.value !== "")
    .map((g) => Number(g.value));
  const avgGrade =
    numGrades.length > 0
      ? numGrades.reduce((a, b) => a + b, 0) / numGrades.length
      : 0;

  const now = new Date();
  const totalAbsences = grades.filter((g) => g.value === "Н").length;

  const monthAbsences = grades.filter((g) => {
    if (g.value !== "Н") return false;
    const d = new Date(g.lesson.date);
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  }).length;

  const records = await prisma.studentRecord.findMany({
    where: { studentId: user.id },
    select: { kind: true, date: true, writtenOffAt: true },
  });
  const recordsNow = new Date();
  const rewards = records.filter((r) => r.kind === RecordKind.REWARD).length;
  const penalties = records.filter(
    (r) =>
      r.kind === RecordKind.PENALTY &&
      !isPenaltyExpired(r, recordsNow) &&
      !isPenaltyWrittenOff(r),
  ).length;

  const labAssignments = await prisma.assignment.findMany({
    where: { groupId: user.groupId ?? "" },
    include: {
      lessons: {
        // Лабораторные работы + любые уроки практических предметов.
        where: {
          OR: [{ type: "лабораторная" }, { assignment: { subject: { isPractical: true } } }],
        },
        include: {
          grades: { where: { studentId: user.id } },
        },
      },
    },
  });

  let totalLabs = 0;
  let passedLabs = 0;
  let overdueLabs = 0;
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  labAssignments.forEach((a) => {
    a.lessons.forEach((l) => {
      totalLabs++;
      const g = l.grades[0]?.value ?? "";
      if (parseInt(g) >= 3) passedLabs++;
      else if (!g && new Date(l.date) < twoWeeksAgo) overdueLabs++;
    });
  });

  const labCompletionRate = totalLabs > 0 ? (passedLabs / totalLabs) * 100 : 0;

  // Рейтинг считаем только при достаточном объёме данных - иначе он недостоверен
  const MIN_GRADES_FOR_RATING = 5;
  const hasEnoughData = numGrades.length >= MIN_GRADES_FOR_RATING;

  let rating =
    avgGrade * 7 +
    labCompletionRate * 0.2 -
    totalAbsences * 1.5 +
    rewards * 3 -
    penalties * 4 +
    5;
  rating = Math.max(0, Math.min(100, rating));

  const getRatingColor = (r: number) => {
    if (r >= 85) return "text-blue-600 dark:text-blue-400";
    if (r >= 70) return "text-green-600 dark:text-green-400";
    if (r >= 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getRatingLabel = (r: number) => {
    if (r >= 95) return "Элита";
    if (r >= 85) return "Отличник";
    if (r >= 70) return "Хорошист";
    if (r >= 50) return "Ударник";
    if (r >= 30) return "Нужно подтянуться";
    return "Ужасный результат";
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">{user.name}</h1>
        <p className="text-muted-foreground">
          Группа: {group?.name || "Не указана"}
        </p>
      </div>

      <Card className="overflow-hidden border-2 border-primary/20 pt-0">
        <CardHeader className="py-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <IconTrophy className="text-yellow-500" />
            Ваш рейтинг
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-8">
          {hasEnoughData ? (
            <>
              <div
                className={cn(
                  "text-7xl font-black tabular-nums",
                  getRatingColor(rating),
                )}
              >
                {rating.toFixed(1)}
              </div>
              <p className="mt-2 text-xl font-semibold uppercase tracking-wider text-muted-foreground">
                {getRatingLabel(rating)}
              </p>
              <div className="mt-6 w-full max-w-md overflow-hidden rounded-full bg-muted">
                <div
                  className="h-3 bg-primary transition-all duration-1000"
                  style={{ width: rating + "%" }}
                />
              </div>
            </>
          ) : (
            <>
              <div className="text-6xl font-black text-muted-foreground/40">
                -
              </div>
              <p className="mt-3 max-w-sm text-center text-sm text-muted-foreground">
                Недостаточно данных для расчёта рейтинга. Он появится, когда
                наберётся больше оценок.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Средний балл
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgGrade.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              По всем предметам за всё время
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Пропуски
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div
                className={cn(
                  "text-3xl font-bold",
                  totalAbsences > 5 ? "text-orange-500" : "",
                )}
              >
                {totalAbsences}
              </div>
              <span className="text-sm text-muted-foreground">уроков</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Общее количество «Н»
            </p>
            <div className="mt-2 flex items-baseline gap-1">
              <span
                className={cn(
                  "text-sm font-semibold",
                  monthAbsences > 3 ? "text-red-500" : "text-muted-foreground",
                )}
              >
                {monthAbsences}
              </span>
              <span className="text-xs text-muted-foreground">
                за текущий месяц
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Поощрения и взыскания
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <IconStar size={18} className="text-yellow-500" />
                <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {rewards}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <IconMoodAngry size={18} className="text-red-500" />
                <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {penalties}
                </span>
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              +{rewards * 3} / −{penalties * 4} к рейтингу
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Лабораторные работы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">
                {passedLabs} / {totalLabs}
              </div>
              <div className="text-sm font-semibold text-green-600">
                {labCompletionRate.toFixed(0)}%
              </div>
            </div>
            <div className="mt-2 flex gap-4">
              {overdueLabs > 0 && (
                <div className="flex items-center gap-1 text-xs font-medium text-red-600">
                  <IconAlertTriangle size={14} />
                  {overdueLabs} просрочено
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {overdueLabs > 0 && avgGrade < 4 && avgGrade > 0 && rating >= 85 && (
        <section className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold">Анализ успеваемости</h3>
          <div className="grid gap-3">
            {overdueLabs > 0 && (
              <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
                <IconClock />
                <div>
                  <p className="font-bold">
                    Внимание! У вас есть просроченные лабораторные работы ({overdueLabs})
                  </p>
                  <p className="text-sm">
                    Это сильно снижает ваш рейтинг. Сдайте их как можно быстрее.
                  </p>
                </div>
              </div>
            )}
            {avgGrade < 4 && avgGrade > 0 && (
              <div className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800 dark:border-yellow-900/50 dark:bg-yellow-900/20 dark:text-yellow-400">
                <IconAlertTriangle />
                <div>
                  <p className="font-bold">Низкий средний балл</p>
                  <p className="text-sm">
                    Ваш средний балл ниже 4. Стоит уделить больше внимания
                    учебе.
                  </p>
                </div>
              </div>
            )}
            {rating >= 85 && (
              <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-800 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-400">
                <IconCircleCheck />
                <div>
                  <p className="font-bold">Отличный результат!</p>
                  <p className="text-sm">
                    Вы входите в число лучших студентов. Так держать!
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
