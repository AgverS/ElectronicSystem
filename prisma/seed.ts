/**
 * Seed script for generating realistic college data.
 *
 * Usage:
 *   pnpm tsx prisma/seed.ts           - clear and regenerate all data
 *   pnpm tsx prisma/seed.ts --reset   - clear all generated data, keep only system accounts
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "@/lib/prisma-client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const RESET_ONLY = process.argv.includes("--reset");

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const TEACHER_COUNT = 40;
const MIN_STUDENTS = 20;
const MAX_STUDENTS = 25;
const SUBJECTS_PER_GROUP = 11; // out of total subjects list
const LESSONS_PER_SEMESTER_MIN = 8;
const LESSONS_PER_SEMESTER_MAX = 14;
const GRADE_PROBABILITY = 0.78; // chance a student gets a grade per lesson

// One letter per specialty; each generates its own set of groups
const SPECIALTY_LETTERS = ["П", "Т", "Э", "К", "Л"];

// Per-specialty group plan: [year, track9groups, track1groups]
// track digit "9" = entered after 9th grade, "1" = entered after 11th grade
const GROUP_PLAN: [number, number, number][] = [
  [2, 2, 1],
  [3, 2, 1],
  [4, 2, 1],
  [5, 1, 0],
];

// ─────────────────────────────────────────────────────────────────────────────
// STATIC DATA
// ─────────────────────────────────────────────────────────────────────────────

const SUBJECTS = [
  "Математика",
  "Физика",
  "Информатика",
  "Программирование на Python",
  "Алгоритмы и структуры данных",
  "Базы данных",
  "Компьютерные сети",
  "Операционные системы",
  "Веб-разработка",
  "Архитектура ЭВМ",
  "Системное администрирование",
  "Русский язык и культура речи",
  "Английский язык",
  "История",
  "Физическая культура",
  "Безопасность жизнедеятельности",
  "Экономика",
  "Право",
];

const LESSON_TOPICS = [
  "Введение в тему",
  "Основные понятия",
  "Практическая работа №1",
  "Практическая работа №2",
  "Лабораторная работа",
  "Контрольная работа",
  "Самостоятельная работа",
  "Семинар",
  "Повторение материала",
  "Решение задач",
  "Проверочная работа",
  "Защита проекта",
  "Тестирование",
  "Разбор ошибок",
  null,
  null,
  null,
];

const MALE_PATRONYMICS = [
  "Александрович",
  "Алексеевич",
  "Андреевич",
  "Аркадьевич",
  "Артёмович",
  "Борисович",
  "Вадимович",
  "Валентинович",
  "Валерьевич",
  "Васильевич",
  "Викторович",
  "Владимирович",
  "Геннадьевич",
  "Дмитриевич",
  "Евгеньевич",
  "Игоревич",
  "Иванович",
  "Константинович",
  "Леонидович",
  "Максимович",
  "Михайлович",
  "Николаевич",
  "Олегович",
  "Павлович",
  "Петрович",
  "Романович",
  "Сергеевич",
  "Степанович",
  "Тимофеевич",
  "Фёдорович",
  "Юрьевич",
  "Глебович",
  "Даниилович",
  "Кириллович",
  "Матвеевич",
];

const FEMALE_PATRONYMICS = [
  "Александровна",
  "Алексеевна",
  "Андреевна",
  "Аркадьевна",
  "Борисовна",
  "Вадимовна",
  "Валентиновна",
  "Валерьевна",
  "Васильевна",
  "Викторовна",
  "Владимировна",
  "Геннадьевна",
  "Дмитриевна",
  "Евгеньевна",
  "Игоревна",
  "Ивановна",
  "Константиновна",
  "Леонидовна",
  "Максимовна",
  "Михайловна",
  "Николаевна",
  "Олеговна",
  "Павловна",
  "Петровна",
  "Романовна",
  "Сергеевна",
  "Степановна",
  "Тимофеевна",
  "Фёдоровна",
  "Юрьевна",
  "Глебовна",
  "Данииловна",
  "Кирилловна",
  "Матвеевна",
];

// Fallback if API is unavailable
const FB_FIRST_MALE = [
  "Александр",
  "Алексей",
  "Андрей",
  "Артём",
  "Борис",
  "Вадим",
  "Василий",
  "Виктор",
  "Владимир",
  "Геннадий",
  "Дмитрий",
  "Евгений",
  "Иван",
  "Игорь",
  "Илья",
  "Кирилл",
  "Константин",
  "Леонид",
  "Максим",
  "Михаил",
  "Никита",
  "Николай",
  "Олег",
  "Павел",
  "Пётр",
  "Роман",
  "Семён",
  "Сергей",
  "Степан",
  "Тимофей",
  "Фёдор",
  "Юрий",
  "Глеб",
  "Даниил",
  "Матвей",
];
const FB_FIRST_FEMALE = [
  "Александра",
  "Алина",
  "Анастасия",
  "Анна",
  "Валентина",
  "Валерия",
  "Вера",
  "Виктория",
  "Галина",
  "Дарья",
  "Екатерина",
  "Елена",
  "Жанна",
  "Ирина",
  "Карина",
  "Кристина",
  "Ксения",
  "Лариса",
  "Людмила",
  "Маргарита",
  "Мария",
  "Надежда",
  "Наталья",
  "Нина",
  "Ольга",
  "Полина",
  "Светлана",
  "Татьяна",
  "Юлия",
  "Яна",
  "Вероника",
  "Диана",
  "Лилия",
  "Софья",
];
const FB_LAST_MALE = [
  "Иванов",
  "Петров",
  "Сидоров",
  "Смирнов",
  "Козлов",
  "Новиков",
  "Морозов",
  "Фёдоров",
  "Волков",
  "Алексеев",
  "Лебедев",
  "Семёнов",
  "Егоров",
  "Попов",
  "Соколов",
  "Захаров",
  "Тихонов",
  "Никитин",
  "Зайцев",
  "Соловьёв",
  "Медведев",
  "Белов",
  "Кузнецов",
  "Голубев",
  "Воронов",
  "Фролов",
  "Борисов",
  "Орлов",
  "Давыдов",
  "Комаров",
  "Малинин",
  "Жуков",
  "Яковлев",
  "Григорьев",
  "Степанов",
  "Павлов",
  "Виноградов",
  "Громов",
];
const FB_LAST_FEMALE = FB_LAST_MALE.map((n) =>
  n.endsWith("ов")
    ? n.slice(0, -2) + "ова"
    : n.endsWith("ев")
      ? n.slice(0, -2) + "ева"
      : n.endsWith("ин")
        ? n + "а"
        : n + "а",
);

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomWeekday(start: Date, end: Date): Date {
  const range = end.getTime() - start.getTime();
  for (let attempt = 0; attempt < 100; attempt++) {
    const d = new Date(start.getTime() + Math.random() * range);
    const day = d.getDay();
    if (day !== 0 && day !== 6) return d;
  }
  return new Date(start);
}

// ─────────────────────────────────────────────────────────────────────────────
// NAME GENERATION
// ─────────────────────────────────────────────────────────────────────────────

interface PersonData {
  firstName: string;
  lastName: string;
  patronymic: string;
  gender: "male" | "female";
}

function nextPerson(): PersonData {
  const g: "male" | "female" = Math.random() > 0.45 ? "male" : "female";
  return {
    firstName: g === "male" ? pick(FB_FIRST_MALE) : pick(FB_FIRST_FEMALE),
    lastName: g === "male" ? pick(FB_LAST_MALE) : pick(FB_LAST_FEMALE),
    patronymic:
      g === "male" ? pick(MALE_PATRONYMICS) : pick(FEMALE_PATRONYMICS),
    gender: g,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// USER FACTORY
// ─────────────────────────────────────────────────────────────────────────────

const usedUsernames = new Set<string>();

function makeUserData(role: Role, groupId?: string) {
  const p = nextPerson();
  const full = `${p.lastName} ${p.firstName} ${p.patronymic}`;
  const base = `${p.lastName} ${p.firstName[0]}.${p.patronymic[0]}.`;

  let username = base;
  let n = 2;
  while (usedUsernames.has(username)) {
    username = `${base}${n++}`;
  }
  usedUsernames.add(username);

  return {
    id: crypto.randomUUID(),
    name: full,
    username,
    emailVerified: false,
    role,
    isMaster: false,
    groupId: groupId ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP NAME GENERATION
// ─────────────────────────────────────────────────────────────────────────────

function buildGroupNames(): string[] {
  const names: string[] = [];
  for (const letter of SPECIALTY_LETTERS) {
    for (const [year, n9, n1] of GROUP_PLAN) {
      for (let i = 1; i <= n9; i++) names.push(`${letter}-${year}9${i}`);
      for (let i = 1; i <= n1; i++) names.push(`${letter}-${year}1${i}`);
    }
  }
  return names;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLEAR DATA
// ─────────────────────────────────────────────────────────────────────────────

async function clearGeneratedData(): Promise<void> {
  process.stdout.write("Очистка данных... ");
  // Schedule entries reference groups, subjects, teachers - delete before them
  await prisma.scheduleSubstitution.deleteMany({});
  await prisma.scheduleEntry.deleteMany({});
  // Cascade order: assignment → lessons → grades (all via FK cascades)
  await prisma.assignment.deleteMany({});
  await prisma.lesson.deleteMany({});
  await prisma.grade.deleteMany({});
  await prisma.auditLog.deleteMany({});
  // Break circular refs before deleting users/groups
  await prisma.group.updateMany({ data: { curatorId: null } });
  await prisma.user.updateMany({
    where: { role: { in: [Role.STUDENT, Role.TEACHER] } },
    data: { groupId: null },
  });
  await prisma.user.deleteMany({
    where: { role: { in: [Role.STUDENT, Role.TEACHER] } },
  });
  await prisma.group.deleteMany({});
  await prisma.subject.deleteMany({});
  await prisma.semester.deleteMany({});
  console.log("✓");
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SEED
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const startTime = Date.now();

  // Always ensure system accounts exist
  await prisma.user.upsert({
    where: { username: "master" },
    update: {},
    create: {
      id: crypto.randomUUID(),
      name: "Master",
      username: "master",
      emailVerified: false,
      role: Role.ADMIN,
      isMaster: true,
    },
  });

  await clearGeneratedData();

  if (RESET_ONLY) {
    console.log(
      "Сброс выполнен. База содержит только системный аккаунт (master).",
    );
    return;
  }

  // ── Semesters ──────────────────────────────────────────────────────────────
  process.stdout.write("Семестры... ");
  const semesters = await Promise.all([
    prisma.semester.create({
      data: {
        name: "1 семестр 2023-2024",
        number: 1,
        year: "2023-2024",
        startDate: new Date("2023-09-01"),
        endDate: new Date("2023-12-29"),
      },
    }),
    prisma.semester.create({
      data: {
        name: "2 семестр 2023-2024",
        number: 2,
        year: "2023-2024",
        startDate: new Date("2024-01-13"),
        endDate: new Date("2024-05-31"),
      },
    }),
    prisma.semester.create({
      data: {
        name: "1 семестр 2024-2025",
        number: 1,
        year: "2024-2025",
        startDate: new Date("2024-09-01"),
        endDate: new Date("2024-12-27"),
      },
    }),
    prisma.semester.create({
      data: {
        name: "2 семестр 2024-2025",
        number: 2,
        year: "2024-2025",
        startDate: new Date("2025-01-13"),
        endDate: new Date("2025-05-30"),
      },
    }),
  ]);
  console.log(`✓ ${semesters.length}`);

  // ── Subjects ───────────────────────────────────────────────────────────────
  process.stdout.write("Предметы... ");
  const subjectRecords = await Promise.all(
    SUBJECTS.map((name) => prisma.subject.create({ data: { name } })),
  );
  console.log(`✓ ${subjectRecords.length}`);

  // ── Teachers ───────────────────────────────────────────────────────────────
  const groupNames = buildGroupNames();
  process.stdout.write("Преподаватели... ");
  const teacherRows = Array.from({ length: TEACHER_COUNT }, () =>
    makeUserData(Role.TEACHER),
  );
  await prisma.user.createMany({ data: teacherRows });
  const teachers = await prisma.user.findMany({
    where: { role: Role.TEACHER },
    orderBy: { name: "asc" },
  });
  console.log(`✓ ${teachers.length}`);

  // ── Groups ─────────────────────────────────────────────────────────────────
  process.stdout.write("Группы... ");
  const shuffledTeachers = shuffle(teachers);
  await prisma.group.createMany({
    data: groupNames.map((name, i) => ({
      name,
      curatorId: shuffledTeachers[i % shuffledTeachers.length].id,
    })),
  });
  const groups = await prisma.group.findMany({ orderBy: { name: "asc" } });
  console.log(`✓ ${groups.length}`);

  // ── Students ───────────────────────────────────────────────────────────────
  process.stdout.write("Студенты... ");
  const groupStudentIds: Record<string, string[]> = {};
  const allStudentRows: ReturnType<typeof makeUserData>[] = [];

  for (const group of groups) {
    const count = randInt(MIN_STUDENTS, MAX_STUDENTS);
    groupStudentIds[group.id] = [];
    for (let i = 0; i < count; i++) {
      const row = makeUserData(Role.STUDENT, group.id);
      allStudentRows.push(row);
      groupStudentIds[group.id].push(row.id);
    }
  }

  for (let i = 0; i < allStudentRows.length; i += 300) {
    await prisma.user.createMany({ data: allStudentRows.slice(i, i + 300) });
  }
  console.log(`✓ ${allStudentRows.length}`);

  // ── Assignments ────────────────────────────────────────────────────────────
  process.stdout.write("Назначения... ");

  // Give each teacher 2-4 subjects they specialise in
  const teacherSubjectIds: Record<string, string[]> = {};
  const shuffledSubs = shuffle(subjectRecords);
  let subIdx = 0;
  for (const t of teachers) {
    const cnt = randInt(2, 4);
    teacherSubjectIds[t.id] = [];
    for (let i = 0; i < cnt; i++) {
      teacherSubjectIds[t.id].push(
        shuffledSubs[subIdx % shuffledSubs.length].id,
      );
      subIdx++;
    }
  }

  // For each group, pick SUBJECTS_PER_GROUP subjects and assign teachers
  const assignmentsToCreate: {
    groupId: string;
    subjectId: string;
    teacherIds: string[];
  }[] = [];

  for (const group of groups) {
    const groupSubjects = shuffle(subjectRecords).slice(0, SUBJECTS_PER_GROUP);

    for (const subject of groupSubjects) {
      // Prefer a teacher who specialises in this subject
      const specialist = teachers.find((t) =>
        teacherSubjectIds[t.id].includes(subject.id),
      );
      const primaryTeacher = specialist ?? pick(teachers);
      const assignedTeachers = [primaryTeacher.id];

      // With 20% probability, assign a second teacher
      if (Math.random() < 0.2) {
        const secondaryTeacher = teachers.find(
          (t) => t.id !== primaryTeacher.id && teacherSubjectIds[t.id].includes(subject.id),
        ) ?? teachers.find((t) => t.id !== primaryTeacher.id);
        if (secondaryTeacher) {
          assignedTeachers.push(secondaryTeacher.id);
        }
      }

      assignmentsToCreate.push({
        groupId: group.id,
        subjectId: subject.id,
        teacherIds: assignedTeachers,
      });
    }
  }

  const CHUNK_SIZE = 50;
  for (let i = 0; i < assignmentsToCreate.length; i += CHUNK_SIZE) {
    const chunk = assignmentsToCreate.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      chunk.map((item) =>
        prisma.assignment.create({
          data: {
            groupId: item.groupId,
            subjectId: item.subjectId,
            teachers: {
              connect: item.teacherIds.map((id) => ({ id })),
            },
          },
        }),
      ),
    );
  }
  const assignments = await prisma.assignment.findMany({
    include: { teachers: true },
  });
  console.log(`✓ ${assignments.length}`);

  // ── Lessons ────────────────────────────────────────────────────────────────
  process.stdout.write("Уроки... ");

  type LessonRow = {
    id: string;
    date: Date;
    topic: string | null;
    assignmentId: string;
    semesterId: string;
  };
  const lessonRows: LessonRow[] = [];
  // Map lessonId → groupId (for grade generation)
  const lessonGroup: Record<string, string> = {};

  for (const a of assignments) {
    for (const sem of semesters) {
      const count = randInt(LESSONS_PER_SEMESTER_MIN, LESSONS_PER_SEMESTER_MAX);
      const dates = Array.from({ length: count }, () =>
        randomWeekday(sem.startDate, sem.endDate),
      ).sort((x, y) => x.getTime() - y.getTime());

      for (const date of dates) {
        const id = crypto.randomUUID();
        lessonRows.push({
          id,
          date,
          topic: pick(LESSON_TOPICS),
          assignmentId: a.id,
          semesterId: sem.id,
        });
        lessonGroup[id] = a.groupId;
      }
    }
  }

  for (let i = 0; i < lessonRows.length; i += 500) {
    await prisma.lesson.createMany({ data: lessonRows.slice(i, i + 500) });
  }
  console.log(`✓ ${lessonRows.length}`);

  // ── Grades ─────────────────────────────────────────────────────────────────
  process.stdout.write("Оценки ");

  type GradeRow = {
    id: string;
    value: string;
    lessonId: string;
    studentId: string;
  };
  const gradeRows: GradeRow[] = [];

  for (const lesson of lessonRows) {
    const studentIds = groupStudentIds[lessonGroup[lesson.id]] ?? [];
    for (const studentId of studentIds) {
      if (Math.random() > GRADE_PROBABILITY) continue;
      const roll = Math.random();
      const value =
        roll < 0.04
          ? "Н"
          : roll < 0.05
            ? "1"
            : roll < 0.08
              ? "2"
              : roll < 0.13
                ? "3"
                : roll < 0.21
                  ? "4"
                  : roll < 0.32
                    ? "5"
                    : roll < 0.46
                      ? "6"
                      : roll < 0.62
                        ? "7"
                        : roll < 0.77
                          ? "8"
                          : roll < 0.9
                            ? "9"
                            : "10";
      gradeRows.push({
        id: crypto.randomUUID(),
        value,
        lessonId: lesson.id,
        studentId,
      });
    }
  }

  const BATCH = 2000;
  const totalBatches = Math.ceil(gradeRows.length / BATCH);
  for (let i = 0; i < gradeRows.length; i += BATCH) {
    await prisma.grade.createMany({
      data: gradeRows.slice(i, i + BATCH),
      skipDuplicates: true,
    });
    const done = Math.floor(((i / BATCH + 1) / totalBatches) * 20);
    process.stdout.write(
      `\rОценки [${"█".repeat(done)}${"░".repeat(20 - done)}] ${Math.min(i + BATCH, gradeRows.length).toLocaleString()}/${gradeRows.length.toLocaleString()}`,
    );
  }
  console.log(" ✓");

  // ── Schedule ───────────────────────────────────────────────────────────────
  process.stdout.write("Расписание... ");

  // Shift 1 (morning): lesson slots 1–8
  // Shift 2 (afternoon): lesson slots 6–13
  const SHIFT1_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8];
  const SHIFT2_SLOTS = [6, 7, 8, 9, 10, 11, 12, 13];

  type ScheduleRow = {
    id: string;
    groupId: string;
    dayOfWeek: number;
    lessonNumber: number;
    subjectId: string;
    teacherId: string;
    room: string;
  };
  const scheduleRows: ScheduleRow[] = [];

  // Build groupId → assignment[] index for quick lookup
  const assignmentsByGroup: Record<string, typeof assignments> = {};
  for (const a of assignments) {
    (assignmentsByGroup[a.groupId] ??= []).push(a);
  }

  for (const group of groups) {
    const groupAssignments = assignmentsByGroup[group.id] ?? [];
    if (groupAssignments.length === 0) continue;

    const isShift1 = Math.random() < 0.5;
    const slots = isShift1 ? SHIFT1_SLOTS : SHIFT2_SLOTS;

    // Mon–Fri always; ~40% of groups also have Saturday
    const days = Math.random() < 0.4 ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];

    const usedSlots = new Set<string>();
    let aIdx = 0;

    for (const day of days) {
      const daySlots = shuffle([...slots]).slice(
        0,
        randInt(6, Math.min(8, slots.length)),
      );
      daySlots.sort((a, b) => a - b);

      for (const lessonNum of daySlots) {
        const slotKey = `${day}-${lessonNum}`;
        if (usedSlots.has(slotKey)) continue;
        usedSlots.add(slotKey);

        const a = groupAssignments[aIdx % groupAssignments.length];
        aIdx++;

        const building = randInt(1, 4);
        const roomNum = String(randInt(1, 30)).padStart(2, "0");
        scheduleRows.push({
          id: crypto.randomUUID(),
          groupId: group.id,
          dayOfWeek: day,
          lessonNumber: lessonNum,
          subjectId: a.subjectId,
          teacherId: pick(a.teachers).id,
          room: `${building}${roomNum}`,
        });
      }
    }
  }

  for (let i = 0; i < scheduleRows.length; i += 500) {
    await prisma.scheduleEntry.createMany({
      data: scheduleRows.slice(i, i + 500),
    });
  }
  console.log(`✓ ${scheduleRows.length}`);

  // ── Summary ────────────────────────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`
╔══════════════════════════════╗
║   Seed завершён за ${elapsed.padStart(5)}с   ║
╠══════════════════════════════╣
║  Семестров:         ${String(semesters.length).padStart(6)}  ║
║  Предметов:         ${String(subjectRecords.length).padStart(6)}  ║
║  Групп:             ${String(groups.length).padStart(6)}  ║
║  Преподавателей:    ${String(teachers.length).padStart(6)}  ║
║  Студентов:         ${String(allStudentRows.length).padStart(6)}  ║
║  Назначений:        ${String(assignments.length).padStart(6)}  ║
║  Уроков:            ${String(lessonRows.length).padStart(6)}  ║
║  Оценок:            ${String(gradeRows.length).padStart(6)}  ║
║  Записей расп.:     ${String(scheduleRows.length).padStart(6)}  ║
╚══════════════════════════════╝`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
