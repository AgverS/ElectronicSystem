"use client";

import { useState, useTransition, useRef } from "react";
import { ABSENT } from "@/lib/grades";
import { useRouter } from "next/navigation";
import { GradeCell, type GradeEntry } from "@/components/teacher/grade-cell";
import { LatenessCell } from "@/components/teacher/lateness-cell";
import { LessonHeader } from "@/components/teacher/lesson-header";
import { AddLessonDialog } from "@/components/teacher/add-lesson-dialog";
import { SemesterSelector } from "@/components/teacher/semester-selector";
import { JournalHours } from "@/components/teacher/journal-hours";
import { JournalLabsTotal } from "@/components/teacher/journal-labs-total";
import { LabHeader } from "@/components/teacher/lab-header";
import { labStatus } from "@/lib/labs";
import { cn, shortName } from "@/lib/utils";
import { courseFromGroupName, formatCourse } from "@/lib/group-course";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IconChevronLeft, IconCheck, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { updateLessonTopic } from "@/lib/actions/teacher";
import { useRefresh } from "@/lib/use-refresh";

function fmtDate(d: Date) {
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function groupByMonth(lessons: { id: string; date: Date }[]) {
  const groups: { month: string; count: number }[] = [];
  for (const lesson of lessons) {
    const month = capitalize(
      lesson.date.toLocaleDateString("ru-RU", {
        month: "long",
        year: "numeric",
      }),
    );
    const last = groups[groups.length - 1];
    if (last && last.month === month) {
      last.count++;
    } else {
      groups.push({ month, count: 1 });
    }
  }
  return groups;
}

function avgColor(val: number) {
  if (val < 4) return "text-red-600 dark:text-red-400";
  if (val < 7) return "text-yellow-600 dark:text-yellow-400";
  if (val < 9) return "text-green-600 dark:text-green-400";
  return "text-blue-600 dark:text-blue-400";
}

function calcAvg(grades: string[]) {
  const nums = grades.filter((g) => g !== ABSENT && g !== "").map(Number);
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function lessonTypeAbbr(type: string) {
  if (type === "lecture") return "Лек.";
  if (type === "practical") return "ПР";
  if (type === "lab") return "ЛР";
  if (type === "assessment") return "assessment";
  return type;
}

function LessonTopicCell({
  lessonId,
  topic,
  readonly,
}: {
  lessonId: string;
  topic: string | null;
  readonly: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(topic ?? "");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const refresh = useRefresh();

  function startEdit() {
    setDraft(topic ?? "");
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function cancelEdit() {
    setDraft(topic ?? "");
    setEditing(false);
  }

  function saveTopic() {
    startTransition(async () => {
      await updateLessonTopic(lessonId, draft);
      refresh();
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <div className={cn("flex items-center gap-0.5", pending && "opacity-50")}>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveTopic();
            if (e.key === "Escape") cancelEdit();
          }}
          className="w-20 rounded border border-input bg-background px-1 py-0.5 text-[10px] outline-none focus:ring-1 focus:ring-ring"
          placeholder="Примечание..."
        />
        <button onClick={saveTopic} disabled={pending} className="text-green-600 hover:text-green-700">
          <IconCheck size={11} />
        </button>
        <button onClick={cancelEdit} className="text-muted-foreground hover:text-foreground">
          <IconX size={11} />
        </button>
      </div>
    );
  }

  if (topic) {
    return (
      <span
        className={cn(
          "block max-w-[56px] truncate text-[10px] text-muted-foreground/70 text-left",
          !readonly && "cursor-pointer hover:text-muted-foreground",
        )}
        title={topic}
        onClick={readonly ? undefined : startEdit}
      >
        {topic}
      </span>
    );
  }

  if (!readonly) {
    return (
      <button
        onClick={startEdit}
        className="text-[10px] text-muted-foreground/30 hover:text-muted-foreground transition-colors"
      >
        + примечание
      </button>
    );
  }

  return <span className="text-muted-foreground/20 text-[10px]">—</span>;
}

interface Semester {
  id: string;
  name: string;
  year: string;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
}

interface Lesson {
  id: string;
  date: Date;
  topic: string | null;
  type: string;
  deadline: Date | null;
}

interface Student {
  id: string;
  name: string;
}

interface JournalViewProps {
  assignment: {
    id: string;
    subject: { name: string; isPractical: boolean };
    group: { name: string; year: number; students: Student[] };
    teachers: { name: string }[];
  };
  semesters: Semester[];
  lessons: Lesson[];
  grades: {
    id: string;
    lessonId: string;
    studentId: string;
    value: string;
    lateness: number | null;
    retakeNumber: number;
  }[];
  activeSemesterId: string | undefined;
  readonly: boolean;
  assignmentId: string;
  plannedHours: number | null;
  labsTotal: number | null;
}

// Текущий семестр определяется по сегодняшней дате: ищем семестр, в чей
// промежуток [startDate, endDate] попадает сегодня. Если такого нет (каникулы) —
// откатываемся на отмеченный вручную или самый свежий по списку.
function resolveCurrentSemester(semesters: Semester[]): Semester | undefined {
  if (semesters.length === 0) return undefined;
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const byDate = semesters.find((s) => {
    const start = new Date(s.startDate).getTime();
    const end = new Date(s.endDate).getTime();
    return start <= today && today <= end;
  });
  return byDate ?? semesters.find((s) => s.isCurrent) ?? semesters[0];
}

export function JournalView({
  assignment,
  semesters,
  lessons,
  grades,
  activeSemesterId,
  readonly,
  assignmentId,
  plannedHours,
  labsTotal,
}: JournalViewProps) {
  // Group all grade records by lesson:student key, sorted by retakeNumber asc
  const gradesMap = new Map<string, GradeEntry[]>();
  for (const g of grades) {
    const key = g.lessonId + ":" + g.studentId;
    const arr = gradesMap.get(key) ?? [];
    arr.push({ id: g.id, value: g.value, retakeNumber: g.retakeNumber });
    gradesMap.set(key, arr);
  }
  for (const arr of gradesMap.values()) {
    arr.sort((a, b) => a.retakeNumber - b.retakeNumber);
  }

  // Effective value for calculations = last grade's value
  function lastVal(key: string): string {
    const arr = gradesMap.get(key);
    if (!arr || arr.length === 0) return "";
    return arr[arr.length - 1].value;
  }

  // Lateness lives only on the base grade (retakeNumber = 0)
  const latenessMap = new Map(
    grades
      .filter((g) => g.retakeNumber === 0)
      .map((g) => [g.lessonId + ":" + g.studentId, g.lateness]),
  );
  const students = assignment.group.students;
  const monthGroups = groupByMonth(lessons);

  // У практических предметов каждый урок считается лабораторной работой.
  const labLessons = lessons.filter(
    (l) => l.type === "lab" || assignment.subject.isPractical,
  );

  const currentSemester = resolveCurrentSemester(semesters);
  const isCurrentSemester = activeSemesterId === currentSemester?.id;
  const activeSemester =
    semesters.find((s) => s.id === activeSemesterId) || currentSemester;

  const conductedHours = lessons.length;
  // Hours are set per current semester (they reset each semester), so editing is
  // only allowed for the owner teacher / admin while viewing the current one.
  const canEditHours = !readonly && isCurrentSemester;
  const remainingHours =
    plannedHours != null ? plannedHours - conductedHours : null;
  const remainingColor =
    remainingHours == null
      ? "text-muted-foreground"
      : remainingHours < 0
        ? "text-red-600 dark:text-red-400"
        : plannedHours != null && remainingHours <= Math.max(2, plannedHours * 0.1)
          ? "text-yellow-600 dark:text-yellow-400"
          : "text-foreground";

  const isPractical = assignment.subject.isPractical;
  const groupCourse = courseFromGroupName(assignment.group.name);
  const isFirstYear = groupCourse === 1;

  const allNums: number[] = [];
  let totalAbsences = 0;
  for (const student of students) {
    for (const lesson of lessons) {
      const g = lastVal(lesson.id + ":" + student.id);
      if (g === ABSENT) totalAbsences++;
      else if (g !== "") {
        // Для практических и 1 курса считаем всё, для остальных исключаем ОКР из текущих
        if (isPractical || isFirstYear || lesson.type !== "assessment") {
          allNums.push(Number(g));
        }
      }
    }
  }
  const classAvg =
    allNums.length > 0
      ? allNums.reduce((a, b) => a + b, 0) / allNums.length
      : null;

  const lessonStats = lessons.map((l) => {
    const vals = students.map((s) => lastVal(l.id + ":" + s.id));
    const nums = vals.filter((g) => g !== ABSENT && g !== "").map(Number);
    const avg = nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
    const absCount = vals.filter((g) => g === ABSENT).length;
    return { avg, absCount };
  });

  const thBase =
    "border-b border-r bg-background px-2 py-1.5 text-center text-xs font-medium text-muted-foreground";
  const tdBase = "border-b border-r px-2 py-1 text-center";

  const router = useRouter();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="-ml-2 h-8 gap-1 px-2"
        >
          <IconChevronLeft size={16} />
          Назад
        </Button>
        <h2 className="font-medium text-muted-foreground">Группа {assignment.group.name}</h2>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {assignment.subject.name} · {assignment.group.name} ({formatCourse(assignment.group.name)})
          </h1>
          <p className="text-sm text-muted-foreground">
            {assignment.teachers.map((t) => shortName(t.name)).join(", ")}
            {readonly && (
              <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">
                Только просмотр
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SemesterSelector
            semesters={semesters}
            currentId={activeSemesterId || ""}
            markCurrentId={currentSemester?.id}
            groupName={assignment.group.name}
          />
          {!readonly && isCurrentSemester && activeSemester && (
            <AddLessonDialog
              assignmentId={assignmentId}
              groupName={assignment.group.name}
              groupYear={groupCourse ?? 1}
              semester={activeSemester}
              isPractical={isPractical}
            />
          )}
        </div>
      </div>

      <Tabs defaultValue="journal" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-[500px]">
          <TabsTrigger value="journal">Журнал</TabsTrigger>
          <TabsTrigger value="lateness">Опоздания</TabsTrigger>
          <TabsTrigger value="labs">Лабораторные работы</TabsTrigger>
        </TabsList>

        <TabsContent value="journal" className="mt-4 flex flex-col gap-4">
          {(lessons.length > 0 || canEditHours) && (
            <div className="flex flex-wrap items-center gap-6 rounded-lg border bg-muted/20 px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">
                Учеников:{" "}
                <strong className="text-foreground">{students.length}</strong>
              </span>
              <span className="text-muted-foreground">
                Уроков:{" "}
                <strong className="text-foreground">{lessons.length}</strong>
              </span>
              <span className="text-muted-foreground">
                Ср. по классу:{" "}
                <strong
                  className={cn(classAvg !== null ? avgColor(classAvg) : "")}
                >
                  {classAvg !== null ? classAvg.toFixed(1) : "-"}
                </strong>
              </span>
              <JournalHours
                assignmentId={assignmentId}
                conductedHours={conductedHours}
                plannedHours={plannedHours}
                canEdit={canEditHours}
              />
              {totalAbsences > 0 && (
                <span className="text-muted-foreground">
                  Пропусков:{" "}
                  <strong className="text-orange-600 dark:text-orange-400">
                    {totalAbsences}
                  </strong>
                </span>
              )}
            </div>
          )}

          {lessons.length === 0 && (
            <p className="text-muted-foreground">
              Уроков пока нет.{!readonly && " Добавьте первый урок."}
            </p>
          )}

          {lessons.length > 0 && (
            <div className="overflow-auto rounded-lg border">
              <table className="border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th
                      rowSpan={2}
                      className={cn(
                        thBase,
                        "sticky left-0 z-20 min-w-44 text-left font-semibold text-foreground border-b-2",
                      )}
                    >
                      ФИО
                    </th>
                    {monthGroups.map((mg) => (
                      <th
                        key={mg.month}
                        colSpan={mg.count}
                        className={cn(thBase, "border-b border-r font-medium")}
                      >
                        {mg.month}
                      </th>
                    ))}
                    <th
                      colSpan={3}
                      className={cn(
                        thBase,
                        "border-l-2 border-r-0 font-semibold",
                      )}
                    >
                      <span className={remainingColor}>
                        {remainingHours == null
                          ? "осталось —"
                          : remainingHours < 0
                            ? `перерасход ${-remainingHours}`
                            : `осталось ${remainingHours}`}
                      </span>
                    </th>
                  </tr>
                  <tr>
                    {lessons.map((l) => (
                      <th
                        key={l.id}
                        className={cn(thBase, "border-b-2 min-w-14", l.type === "assessment" && "bg-amber-50 dark:bg-amber-950/30")}
                      >
                        <LessonHeader
                          lessonId={l.id}
                          assignmentId={assignmentId}
                          date={fmtDate(l.date)}
                          readonly={readonly || !isCurrentSemester}
                        />
                      </th>
                    ))}
                    <th
                      className={cn(
                        thBase,
                        "min-w-16 border-l-2 font-semibold text-foreground border-b-2",
                      )}
                    >
                      Текущая
                    </th>
                    <th
                      className={cn(
                        thBase,
                        "min-w-14 font-semibold text-foreground border-b-2",
                      )}
                    >
                      Итог
                    </th>
                    <th
                      className={cn(
                        thBase,
                        "min-w-10 font-semibold text-foreground border-r-0 border-b-2",
                      )}
                    >
                      Н
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {students.map((student, idx) => {
                    // Use last retake value for all grade calculations
                    const studentLastValues = lessons.map(
                      (l) => lastVal(l.id + ":" + student.id),
                    );

                    // Текущая: для практических и 1 курса - все, для остальных - кроме ОКР
                    const currentGrades = lessons
                      .filter(
                        (l) => isPractical || isFirstYear || l.type !== "assessment",
                      )
                      .map((l) => lastVal(l.id + ":" + student.id))
                      .filter((g) => g !== ABSENT && g !== "");

                    const currentAvg = calcAvg(currentGrades);

                    // ОКР отметки (только если не практический и не 1 курс)
                    const okrGrades =
                      !isPractical && !isFirstYear
                        ? lessons
                          .filter((l) => l.type === "assessment")
                          .map((l) => lastVal(l.id + ":" + student.id))
                          .filter((g) => g !== ABSENT && g !== "")
                          .map(Number)
                        : [];

                    const okrVal = okrGrades.length > 0 ? okrGrades[0] : null;

                    // Итог
                    let finalGrade: number | null = null;
                    if (isPractical || isFirstYear) {
                      finalGrade = currentAvg;
                    } else {
                      if (currentAvg !== null && okrVal !== null) {
                        finalGrade = (currentAvg + okrVal) / 2;
                      } else if (currentAvg !== null) {
                        finalGrade = currentAvg;
                      }
                    }

                    const absences = studentLastValues.filter(
                      (g) => g === ABSENT,
                    ).length;

                    return (
                      <tr
                        key={student.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="sticky left-0 z-10 bg-background border-b border-r px-3 py-1.5 font-medium whitespace-nowrap hover:bg-muted/30">
                          <span className="mr-2 text-muted-foreground tabular-nums">
                            {idx + 1}.
                          </span>
                          <span className="sm:hidden">{shortName(student.name)}</span>
                          <span className="hidden sm:inline">{student.name}</span>
                        </td>
                        {lessons.map((l) => (
                          <td key={l.id} className={cn(tdBase, "align-middle", l.type === "assessment" && "bg-amber-50/60 dark:bg-amber-950/20")}>
                            <GradeCell
                              lessonId={l.id}
                              studentId={student.id}
                              assignmentId={assignmentId}
                              grades={gradesMap.get(l.id + ":" + student.id) ?? []}
                              readonly={readonly || !isCurrentSemester}
                              lessonType={l.type}
                            />
                          </td>
                        ))}
                        <td className="border-b border-l-2 border-r px-2 py-1 text-center">
                          {currentAvg !== null ? (
                            <span
                              className={cn(
                                "text-sm font-semibold tabular-nums",
                                avgColor(currentAvg),
                              )}
                            >
                              {currentAvg.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/30">-</span>
                          )}
                        </td>
                        <td className="border-b border-r px-2 py-1 text-center bg-muted/10">
                          {finalGrade !== null ? (
                            <span
                              className={cn(
                                "text-sm font-bold tabular-nums",
                                avgColor(finalGrade),
                              )}
                            >
                              {finalGrade.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/30">-</span>
                          )}
                        </td>
                        <td className="border-b border-r-0 px-2 py-1 text-center">
                          {absences > 0 ? (
                            <span className="text-sm font-semibold tabular-nums text-orange-600 dark:text-orange-400">
                              {absences}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/20">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                <tfoot>
                  <tr className="bg-muted/20">
                    <td className="sticky left-0 z-10 bg-background border-t-2 border-b border-r px-3 py-1 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                      Ср. за урок
                    </td>
                    {lessonStats.map((stat, i) => (
                      <td key={lessons[i].id} className={cn("border-t-2 border-b border-r px-2 py-1 text-center", lessons[i].type === "assessment" && "bg-amber-50 dark:bg-amber-950/30")}>
                        {stat.avg !== null ? (
                          <span className={cn("text-xs font-semibold tabular-nums", avgColor(stat.avg))}>
                            {stat.avg.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/30">-</span>
                        )}
                      </td>
                    ))}
                    <td className="border-t-2 border-b border-l-2 border-r px-2 py-1 text-center" />
                    <td className="border-t-2 border-b border-r px-2 py-1 text-center bg-muted/10">
                      {classAvg !== null ? (
                        <span className={cn("text-sm font-bold tabular-nums", avgColor(classAvg))}>
                          {classAvg.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/30">-</span>
                      )}
                    </td>
                    <td className="border-t-2 border-b border-r-0 px-2 py-1 text-center" />
                  </tr>
                  <tr className="bg-muted/20">
                    <td className="sticky left-0 z-10 bg-background border-b border-r px-3 py-1 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                      Н за урок
                    </td>
                    {lessonStats.map((stat, i) => (
                      <td key={lessons[i].id} className={cn("border-b border-r px-2 py-1 text-center", lessons[i].type === "assessment" && "bg-amber-50 dark:bg-amber-950/30")}>
                        {stat.absCount > 0 ? (
                          <span className="text-xs font-semibold tabular-nums text-orange-600 dark:text-orange-400">
                            {stat.absCount}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/20">-</span>
                        )}
                      </td>
                    ))}
                    <td className="border-b border-l-2 border-r px-2 py-1 text-center" />
                    <td className="border-b border-r px-2 py-1 text-center bg-muted/10" />
                    <td className="border-b border-r-0 px-2 py-1 text-center">
                      {totalAbsences > 0 ? (
                        <span className="text-sm font-bold tabular-nums text-orange-600 dark:text-orange-400">
                          {totalAbsences}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/20">-</span>
                      )}
                    </td>
                  </tr>
                  <tr className="bg-muted/10">
                    <td className="sticky left-0 z-10 bg-background border-b border-r px-3 py-1 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                      Примечание
                    </td>
                    {lessons.map((l) => (
                      <td key={l.id} className={cn("border-b border-r px-2 py-1 text-center", l.type === "assessment" && "bg-amber-50 dark:bg-amber-950/30")}>
                        <LessonTopicCell
                          lessonId={l.id}
                          topic={l.topic}
                          readonly={readonly || !isCurrentSemester}
                        />
                      </td>
                    ))}
                    <td className="border-b border-l-2 border-r px-2 py-1" />
                    <td className="border-b border-r px-2 py-1 bg-muted/10" />
                    <td className="border-b border-r-0 px-2 py-1" />
                  </tr>
                  <tr className="bg-muted/10">
                    <td className="sticky left-0 z-10 bg-background border-b border-r px-3 py-1 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                      Тип урока
                    </td>
                    {lessons.map((l) => (
                      <td key={l.id} className={cn("border-b border-r px-2 py-1 text-center", l.type === "assessment" && "bg-amber-50 dark:bg-amber-950/30")}>
                        <span className={cn("text-[10px] font-medium", l.type === "assessment" ? "text-amber-700 dark:text-amber-400 font-bold" : "text-muted-foreground")}>
                          {lessonTypeAbbr(l.type)}
                        </span>
                      </td>
                    ))}
                    <td className="border-b border-l-2 border-r px-2 py-1" />
                    <td className="border-b border-r px-2 py-1 bg-muted/10" />
                    <td className="border-b border-r-0 px-2 py-1" />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="lateness" className="mt-4">
          {lessons.length === 0 && (
            <p className="text-muted-foreground">Уроков пока нет.</p>
          )}

          {lessons.length > 0 && (
            <div className="overflow-auto rounded-lg border">
              <table className="border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th
                      className={cn(
                        thBase,
                        "sticky left-0 z-20 min-w-44 text-left font-semibold text-foreground border-b-2",
                      )}
                    >
                      ФИО
                    </th>
                    {lessons.map((l) => (
                      <th
                        key={l.id}
                        className={cn(thBase, "border-b-2 min-w-14")}
                      >
                        {fmtDate(l.date)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, idx) => (
                    <tr
                      key={student.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="sticky left-0 z-10 bg-background border-b border-r px-3 py-1.5 font-medium whitespace-nowrap hover:bg-muted/30">
                        <span className="mr-2 text-muted-foreground tabular-nums">
                          {idx + 1}.
                        </span>
                        <span className="sm:hidden">{shortName(student.name)}</span>
                        <span className="hidden sm:inline">{student.name}</span>
                      </td>
                      {lessons.map((l) => (
                        <td key={l.id} className={tdBase}>
                          <LatenessCell
                            lessonId={l.id}
                            studentId={student.id}
                            assignmentId={assignmentId}
                            initialValue={
                              latenessMap.get(l.id + ":" + student.id) ?? null
                            }
                            readonly={readonly || !isCurrentSemester}
                            isAbsent={
                              lastVal(l.id + ":" + student.id) === ABSENT
                            }
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="labs" className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-6 rounded-lg border bg-muted/20 px-4 py-2.5 text-sm">
            <JournalLabsTotal
              assignmentId={assignmentId}
              issued={labLessons.length}
              total={labsTotal}
              canEdit={!readonly && isCurrentSemester}
            />
          </div>

          {labLessons.length === 0 ? (
            <p className="text-muted-foreground">Лабораторных работ пока нет.</p>
          ) : (
            <div className="overflow-auto rounded-lg border">
              <table className="w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th
                      className={cn(
                        thBase,
                        "sticky left-0 z-20 min-w-44 text-left font-semibold text-foreground border-b-2",
                      )}
                    >
                      ФИО
                    </th>
                    {labLessons.map((l) => (
                      <th
                        key={l.id}
                        className={cn(thBase, "border-b-2 min-w-20")}
                      >
                        <LabHeader
                          lessonId={l.id}
                          assignmentId={assignmentId}
                          date={l.date}
                          deadline={l.deadline}
                          readonly={readonly || !isCurrentSemester}
                        />
                      </th>
                    ))}
                    <th
                      className={cn(
                        thBase,
                        "min-w-12 border-l-2 font-semibold text-foreground border-b-2",
                      )}
                    >
                      Сдано
                    </th>
                    <th
                      className={cn(
                        thBase,
                        "min-w-12 font-semibold text-foreground border-b-2",
                      )}
                    >
                      Не зачтено
                    </th>
                    <th
                      className={cn(
                        thBase,
                        "min-w-12 font-semibold text-foreground border-b-2",
                      )}
                    >
                      Выдано
                    </th>
                    <th
                      className={cn(
                        thBase,
                        "min-w-12 border-r-0 font-semibold text-foreground border-b-2",
                      )}
                    >
                      Всего
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, idx) => {
                    let passed = 0;
                    const labStatuses = labLessons.map((l) =>
                      labStatus(lastVal(l.id + ":" + student.id), l.date, l.deadline),
                    );
                    const passedCount = labStatuses.filter((s) => s === "passed").length;
                    const overdueCount = labStatuses.filter((s) => s === "paid").length;
                    const allSubmitted = labLessons.length > 0 && passedCount === labLessons.length;
                    const highlyOverdue = overdueCount >= 5;
                    const rowBg = allSubmitted
                      ? "bg-green-50/60 dark:bg-green-950/20 hover:bg-green-100/80 dark:hover:bg-green-950/30"
                      : highlyOverdue
                        ? "bg-red-50/60 dark:bg-red-950/20 hover:bg-red-100/80 dark:hover:bg-red-950/30"
                        : "hover:bg-muted/30";
                    const stickyBg = allSubmitted
                      ? "bg-green-50 dark:bg-green-950/30 hover:bg-green-100/80 dark:hover:bg-green-950/40"
                      : highlyOverdue
                        ? "bg-red-50 dark:bg-red-950/30 hover:bg-red-100/80 dark:hover:bg-red-950/40"
                        : "bg-background hover:bg-muted/30";
                    return (
                      <tr
                        key={student.id}
                        className={cn("transition-colors", rowBg)}
                      >
                        <td className={cn("sticky left-0 z-10 border-b border-r px-3 py-1.5 font-medium whitespace-nowrap", stickyBg)}>
                          <span className="mr-2 text-muted-foreground tabular-nums">
                            {idx + 1}.
                          </span>
                          <span className="sm:hidden">{shortName(student.name)}</span>
                          <span className="hidden sm:inline">{student.name}</span>
                        </td>
                        {labLessons.map((l) => {
                          const g = lastVal(l.id + ":" + student.id);
                          const status = labStatus(g, l.date, l.deadline);
                          if (status === "passed") passed++;

                          return (
                            <td key={l.id} className={tdBase}>
                              {status === "passed" ? (
                                <span className="inline-flex items-center justify-center rounded-full bg-green-100 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-green-700 dark:bg-green-950/60 dark:text-green-300">
                                  Зачтено
                                </span>
                              ) : status === "paid" ? (
                                <span className="inline-flex items-center justify-center rounded-full bg-red-100 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-red-700 dark:bg-red-950/60 dark:text-red-300">
                                  Платная
                                </span>
                              ) : g ? (
                                <span className="font-mono text-sm font-bold tabular-nums text-red-600 dark:text-red-400">
                                  {g}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/30">·</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="border-b border-l-2 border-r px-2 py-1 text-center tabular-nums font-semibold text-green-600 dark:text-green-400">
                          {passed || <span className="text-muted-foreground/20">0</span>}
                        </td>
                        <td className="border-b border-r px-2 py-1 text-center tabular-nums font-semibold">
                          {labLessons.length - passed > 0 ? (
                            <span className="text-red-600 dark:text-red-400">
                              {labLessons.length - passed}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/20">0</span>
                          )}
                        </td>
                        <td className="border-b border-r px-2 py-1 text-center tabular-nums text-muted-foreground">
                          {labLessons.length}
                        </td>
                        <td className="border-b border-r-0 px-2 py-1 text-center tabular-nums font-semibold bg-muted/10">
                          {labsTotal ?? (
                            <span className="text-muted-foreground/30">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
