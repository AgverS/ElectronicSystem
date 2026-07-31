/**
 * Fills the database with a fictional institution, "Meridian Technical College".
 *
 * Three properties are deliberate:
 *  - Deterministic. A fixed seed, so every run produces the same college and
 *    screenshots stay reproducible.
 *  - Dated relative to today. The current semester always contains the current
 *    date, so the demo never looks abandoned however long after it was built
 *    someone opens it.
 *  - Internally consistent. No teacher and no room is ever timetabled twice in
 *    the same period — a reviewer notices that immediately.
 *
 * Usage:
 *   pnpm prisma db seed              fill (refuses if data already exists)
 *   tsx prisma/seed.ts --reset       wipe first, then fill
 *   tsx prisma/seed.ts --if-empty    fill only when empty (used on container start)
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role, RecordKind } from "../lib/generated/prisma";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

/* ------------------------------ determinism ------------------------------ */

/** mulberry32 — small, fast, and stable across runs. */
function makeRandom(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = makeRandom(20260728);
const pick = <T>(list: readonly T[]): T => list[Math.floor(rand() * list.length)];
const chance = (p: number) => rand() < p;
const between = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

/* -------------------------------- dates ---------------------------------- */

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));
const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};
const TODAY = (() => {
  const now = new Date();
  return utc(now.getFullYear(), now.getMonth() + 1, now.getDate());
})();

/* ------------------------------ vocabulary ------------------------------- */

const FIRST_NAMES = [
  "Amelia", "Noah", "Sofia", "Lucas", "Mia", "Adrian", "Elena", "Marcus",
  "Nadia", "Ethan", "Clara", "Omar", "Ines", "Viktor", "Leila", "Tomas",
  "Hanna", "Rafael", "Yuki", "Daniel", "Zofia", "Andrei", "Maya", "Felix",
  "Sara", "Julian", "Nora", "Pavel", "Aisha", "Mateo", "Lena", "Kiran",
  "Emma", "Anton", "Alma", "Diego", "Ivy", "Samir", "Greta", "Milos",
  "Priya", "Jonas", "Alice", "Karim", "Freya", "Dmitri", "Chloe", "Hugo",
];

const LAST_NAMES = [
  "Novak", "Bennett", "Kovac", "Marsh", "Petrov", "Lindqvist", "Duarte",
  "Halvorsen", "Moreau", "Castellanos", "Weber", "Okafor", "Rossi", "Vance",
  "Kaminski", "Ferreira", "Sandoval", "Brennan", "Dvorak", "Larsen",
  "Hoffmann", "Silva", "Nakamura", "Volkov", "Escobar", "Whitfield",
  "Andersen", "Baptiste", "Oduya", "Reinhardt", "Chalmers", "Nowak",
  "Delacroix", "Bergman", "Fontaine", "Marchetti", "Sorensen", "Ivanova",
];

const ROOMS = [
  "A-104", "A-108", "A-212", "B-201", "B-205", "B-310", "C-102", "C-114",
  "C-303", "D-011", "D-015", "Lab 1", "Lab 2", "Lab 3", "Studio A",
];

const LESSON_TOPICS: Record<string, string[]> = {
  programming: [
    "Variables, types and control flow", "Functions and scope", "Arrays and iteration",
    "Recursion in practice", "Error handling patterns", "Working with files",
    "Introduction to complexity", "Sorting algorithms", "Searching algorithms",
    "Code review workshop", "Debugging techniques", "Mid-term assessment",
  ],
  databases: [
    "The relational model", "SELECT and filtering", "Joins across tables",
    "Aggregation and grouping", "Normalisation to 3NF", "Indexes and query plans",
    "Transactions and isolation", "Stored procedures", "Schema design workshop",
    "Backup and recovery", "Practical: building a schema", "Mid-term assessment",
  ],
  web: [
    "How the web works", "Semantic HTML", "Layout with flexbox and grid",
    "Responsive design", "JavaScript in the browser", "The DOM and events",
    "Fetching data from an API", "Client-side routing", "Accessibility basics",
    "Forms and validation", "Practical: a small application", "Mid-term assessment",
  ],
  networks: [
    "The OSI model", "Ethernet and switching", "IPv4 addressing and subnets",
    "Routing fundamentals", "TCP versus UDP", "DNS and DHCP",
    "Network security basics", "Wireless networking", "Lab: building a subnet",
    "Troubleshooting methodology", "VLANs in practice", "Mid-term assessment",
  ],
  general: [
    "Course introduction", "Core concepts", "Guided practice", "Case study",
    "Group workshop", "Independent study review", "Applied exercises",
    "Presentation session", "Revision and consolidation", "Practical work",
    "Seminar discussion", "Mid-term assessment",
  ],
};

const ABSENT = "AB";

/* -------------------------------- wiping --------------------------------- */

/** Children before parents, so foreign keys stay satisfied throughout. */
async function wipe() {
  await prisma.grade.deleteMany();
  await prisma.excusedAbsence.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.extraLessonRsvp.deleteMany();
  await prisma.extraLesson.deleteMany();
  await prisma.recordAttachment.deleteMany();
  await prisma.studentRecord.deleteMany();
  await prisma.scheduleSubstitution.deleteMany();
  await prisma.scheduleEntry.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.group.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.specialty.deleteMany();
  await prisma.semester.deleteMany();
  await prisma.bellOverrideSlot.deleteMany();
  await prisma.bellOverride.deleteMany();
  await prisma.bellTime.deleteMany();
  await prisma.backupSetting.deleteMany();
}

/* -------------------------------- seeding -------------------------------- */

async function seed() {
  /* -- specialties -- */
  const specialtySpecs = [
    { id: "spec-sd", name: "Software Development", abbreviation: "SD", letter: "S" },
    { id: "spec-net", name: "Computer Networks & Systems", abbreviation: "CNS", letter: "N" },
    { id: "spec-des", name: "Digital Design", abbreviation: "DD", letter: "D" },
    { id: "spec-bus", name: "Business Administration", abbreviation: "BA", letter: "B" },
  ];
  await prisma.specialty.createMany({ data: specialtySpecs });

  /* -- semesters, anchored so the current one contains today -- */
  const year = TODAY.getUTCFullYear();
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  const currentStart = addDays(TODAY, -11 * 7);
  const currentEnd = addDays(TODAY, 9 * 7);
  const academicYearOf = (d: Date) => {
    const y = d.getUTCFullYear();
    return d.getUTCMonth() + 1 >= 9 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
  };

  const semesterSpecs = [3, 2, 1, 0].map((back, i) => {
    const start = new Date(currentStart.getTime() - back * 26 * WEEK);
    const end = new Date(currentEnd.getTime() - back * 26 * WEEK);
    return { id: `sem-${i + 3}`, number: i + 3, year: academicYearOf(start), start, end };
  });
  const currentSemester = semesterSpecs[semesterSpecs.length - 1];

  await prisma.semester.createMany({
    data: semesterSpecs.map((s) => ({
      id: s.id,
      name: `Semester ${s.number}`,
      number: s.number,
      year: s.year,
      startDate: s.start,
      endDate: s.end,
      isCurrent: s.id === currentSemester.id,
      createdAt: s.start,
    })),
  });

  /* -- subjects -- */
  const subjectSpecs = [
    { id: "sub-prog", name: "Programming Fundamentals", isPractical: true, hours: 120, topics: "programming", specs: ["spec-sd", "spec-net"] },
    { id: "sub-db", name: "Databases", isPractical: true, hours: 96, topics: "databases", specs: ["spec-sd", "spec-bus"] },
    { id: "sub-web", name: "Web Development", isPractical: true, hours: 108, topics: "web", specs: ["spec-sd", "spec-des"] },
    { id: "sub-os", name: "Operating Systems", isPractical: true, hours: 84, topics: "general", specs: ["spec-sd", "spec-net"] },
    { id: "sub-net", name: "Computer Networks", isPractical: true, hours: 96, topics: "networks", specs: ["spec-net"] },
    { id: "sub-sec", name: "Information Security", isPractical: true, hours: 72, topics: "general", specs: ["spec-net", "spec-sd"] },
    { id: "sub-math", name: "Discrete Mathematics", isPractical: false, hours: 96, topics: "general", specs: ["spec-sd", "spec-net"] },
    { id: "sub-eng", name: "Professional English", isPractical: false, hours: 72, topics: "general", specs: ["spec-sd", "spec-net", "spec-des", "spec-bus"] },
    { id: "sub-econ", name: "Economics of Enterprise", isPractical: false, hours: 64, topics: "general", specs: ["spec-bus"] },
    { id: "sub-mgmt", name: "Project Management", isPractical: false, hours: 64, topics: "general", specs: ["spec-bus", "spec-sd"] },
    { id: "sub-ux", name: "Interface Design", isPractical: true, hours: 108, topics: "general", specs: ["spec-des"] },
    { id: "sub-graph", name: "Computer Graphics", isPractical: true, hours: 96, topics: "general", specs: ["spec-des"] },
  ];
  for (const s of subjectSpecs) {
    await prisma.subject.create({
      data: {
        id: s.id,
        name: s.name,
        isPractical: s.isPractical,
        hours: s.hours,
        hoursSemesterId: currentSemester.id,
        specialties: { connect: s.specs.map((id) => ({ id })) },
      },
    });
  }

  /* -- staff -- */
  let seq = 0;
  const nextId = () => `user-${String(++seq).padStart(4, "0")}`;
  const handleFor = (name: string) => {
    const [first, last] = name.split(" ");
    return `${first[0].toLowerCase()}.${last.toLowerCase()}`;
  };

  const admin = await prisma.user.create({
    data: {
      id: nextId(),
      name: "Helena Ward",
      username: handleFor("Helena Ward"),
      email: `${handleFor("Helena Ward")}@meridian.example`,
      emailVerified: true,
      role: Role.ADMIN,
      calendarToken: "demo-token-admin",
      specialties: { connect: specialtySpecs.map((s) => ({ id: s.id })) },
    },
  });

  const teacherSpecs = [
    { name: "Daniel Okafor", subjects: ["sub-prog", "sub-os"], specs: ["spec-sd"] },
    { name: "Marta Lindqvist", subjects: ["sub-db", "sub-prog"], specs: ["spec-sd", "spec-bus"] },
    { name: "Julien Moreau", subjects: ["sub-web", "sub-ux"], specs: ["spec-sd", "spec-des"] },
    { name: "Priya Raman", subjects: ["sub-net", "sub-sec"], specs: ["spec-net"] },
    { name: "Anton Dvorak", subjects: ["sub-math"], specs: ["spec-sd", "spec-net"] },
    { name: "Grace Bennett", subjects: ["sub-eng"], specs: ["spec-sd", "spec-net", "spec-des", "spec-bus"] },
    { name: "Ricardo Duarte", subjects: ["sub-econ", "sub-mgmt"], specs: ["spec-bus"] },
    { name: "Sofia Marchetti", subjects: ["sub-graph", "sub-ux"], specs: ["spec-des"] },
    { name: "Erik Halvorsen", subjects: ["sub-os", "sub-sec"], specs: ["spec-net"] },
    { name: "Nadia Kaminski", subjects: ["sub-db", "sub-mgmt"], specs: ["spec-bus", "spec-sd"] },
  ];

  const teachers: { id: string }[] = [];
  for (const [i, t] of teacherSpecs.entries()) {
    teachers.push(
      await prisma.user.create({
        data: {
          id: nextId(),
          name: t.name,
          username: handleFor(t.name),
          email: `${handleFor(t.name)}@meridian.example`,
          emailVerified: true,
          role: Role.TEACHER,
          calendarToken: `demo-token-teacher-${i + 1}`,
          subjects: { connect: t.subjects.map((id) => ({ id })) },
          specialties: { connect: t.specs.map((id) => ({ id })) },
        },
      }),
    );
  }

  const teacherFor = (subjectId: string) => {
    const eligible = teacherSpecs
      .map((t, i) => ({ t, id: teachers[i].id }))
      .filter((x) => x.t.subjects.includes(subjectId));
    return eligible.length ? pick(eligible).id : teachers[0].id;
  };

  /* -- groups -- */
  const groupSpecs = [
    { id: "grp-sd31", name: "SD-31", specialtyId: "spec-sd", year: 3, curator: 0, subjects: ["sub-prog", "sub-db", "sub-web", "sub-math", "sub-eng", "sub-mgmt"] },
    { id: "grp-sd32", name: "SD-32", specialtyId: "spec-sd", year: 3, curator: 1, subjects: ["sub-prog", "sub-db", "sub-web", "sub-math", "sub-eng", "sub-os"] },
    { id: "grp-sd21", name: "SD-21", specialtyId: "spec-sd", year: 2, curator: 2, subjects: ["sub-prog", "sub-math", "sub-eng", "sub-os", "sub-sec"] },
    { id: "grp-cns31", name: "CNS-31", specialtyId: "spec-net", year: 3, curator: 3, subjects: ["sub-net", "sub-sec", "sub-os", "sub-math", "sub-eng"] },
    { id: "grp-cns21", name: "CNS-21", specialtyId: "spec-net", year: 2, curator: 8, subjects: ["sub-net", "sub-prog", "sub-math", "sub-eng"] },
    { id: "grp-dd31", name: "DD-31", specialtyId: "spec-des", year: 3, curator: 7, subjects: ["sub-ux", "sub-graph", "sub-web", "sub-eng"] },
    { id: "grp-ba31", name: "BA-31", specialtyId: "spec-bus", year: 3, curator: 6, subjects: ["sub-econ", "sub-mgmt", "sub-db", "sub-eng"] },
    { id: "grp-ba21", name: "BA-21", specialtyId: "spec-bus", year: 2, curator: 9, subjects: ["sub-econ", "sub-mgmt", "sub-eng"] },
  ];
  await prisma.group.createMany({
    data: groupSpecs.map((g) => ({
      id: g.id,
      name: g.name,
      year: g.year,
      specialtyId: g.specialtyId,
      curatorId: teachers[g.curator].id,
    })),
  });

  /* -- students -- */
  const used = new Set<string>();
  const students: { id: string; groupId: string }[] = [];
  const studentRows = [];

  for (const g of groupSpecs) {
    for (let i = 0, size = between(12, 16); i < size; i++) {
      let name = "";
      for (let attempt = 0; attempt < 40 && !name; attempt++) {
        const candidate = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
        if (!used.has(candidate)) name = candidate;
      }
      if (!name) name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)} ${students.length}`;
      used.add(name);

      const id = nextId();
      const handle = handleFor(name);
      studentRows.push({
        id,
        name,
        username: `${handle}${between(10, 99)}`,
        email: `${handle}@students.meridian.example`,
        emailVerified: true,
        role: Role.STUDENT,
        groupId: g.id,
        calendarToken: `demo-token-${id}`,
      });
      students.push({ id, groupId: g.id });
    }
  }
  await prisma.user.createMany({ data: studentRows });

  /* -- assignments -- */
  const assignments: { id: string; groupId: string; subjectId: string; teacherId: string }[] = [];
  for (const g of groupSpecs) {
    for (const subjectId of g.subjects) {
      const teacherId = teacherFor(subjectId);
      const subject = subjectSpecs.find((s) => s.id === subjectId)!;
      const created = await prisma.assignment.create({
        data: {
          groupId: g.id,
          subjectId,
          labsTotal: subject.isPractical ? between(6, 10) : null,
          teachers: { connect: [{ id: teacherId }] },
        },
      });
      assignments.push({ id: created.id, groupId: g.id, subjectId, teacherId });
    }
  }

  /* -- lessons and grades -- */
  const previous = semesterSpecs[semesterSpecs.length - 2];
  const GRADES = ["4", "5", "5", "6", "6", "7", "7", "7", "8", "8", "9", "9", "10", "3"];

  const byGroup = new Map<string, string[]>();
  for (const s of students) {
    const list = byGroup.get(s.groupId) ?? [];
    list.push(s.id);
    byGroup.set(s.groupId, list);
  }

  const lessonRows: {
    id: string; date: Date; topic: string; type: string; deadline: Date | null;
    assignmentId: string; semesterId: string; createdAt: Date;
  }[] = [];
  const gradeRows: {
    value: string; lateness: number | null; retakeNumber: number;
    lessonId: string; studentId: string; createdAt: Date;
  }[] = [];
  let lessonSeq = 0;

  function generateLessons(
    semester: (typeof semesterSpecs)[number],
    assignment: (typeof assignments)[number],
    maxLessons: number,
    ratio: number,
  ) {
    const subject = subjectSpecs.find((s) => s.id === assignment.subjectId)!;
    const topics = LESSON_TOPICS[subject.topics] ?? LESSON_TOPICS.general;
    const groupStudents = byGroup.get(assignment.groupId) ?? [];

    const weekday = 1 + (assignment.id.charCodeAt(assignment.id.length - 1) % 5);
    let cursor = new Date(semester.start);
    while (cursor.getUTCDay() !== weekday) cursor = addDays(cursor, 1);

    const horizon = semester.end < TODAY ? semester.end : TODAY;
    let index = 0;

    while (cursor <= horizon && index < maxLessons) {
      const type = subject.isPractical
        ? index % 4 === 3
          ? "lab"
          : index % 4 === 1
            ? "practical"
            : index === maxLessons - 1
              ? "assessment"
              : "lecture"
        : index === maxLessons - 1
          ? "assessment"
          : index % 3 === 1
            ? "practical"
            : "lecture";

      const lessonId = `lesson-${++lessonSeq}`;
      lessonRows.push({
        id: lessonId,
        date: new Date(cursor),
        topic: topics[index % topics.length],
        type,
        deadline: type === "lab" ? addDays(cursor, 14) : null,
        assignmentId: assignment.id,
        semesterId: semester.id,
        createdAt: new Date(cursor),
      });

      for (const studentId of groupStudents) {
        if (!chance(ratio)) continue;
        const value = chance(0.08) ? ABSENT : pick(GRADES);
        gradeRows.push({
          value,
          lateness: value !== ABSENT && chance(0.06) ? between(3, 20) : null,
          retakeNumber: 0,
          lessonId,
          studentId,
          createdAt: new Date(cursor),
        });
      }

      cursor = addDays(cursor, 7);
      index += 1;
    }
  }

  for (const a of assignments) {
    generateLessons(currentSemester, a, 14, 0.62);
    generateLessons(previous, a, 5, 0.5);
  }

  await prisma.lesson.createMany({ data: lessonRows });
  // In batches: one statement with thousands of rows is slow and can exceed the
  // driver's parameter limit.
  for (let i = 0; i < gradeRows.length; i += 1000) {
    await prisma.grade.createMany({ data: gradeRows.slice(i, i + 1000) });
  }

  /* -- weekly timetable, free of teacher and room clashes -- */
  const busyTeachers = new Set<string>();
  const busyRooms = new Set<string>();
  const scheduleRows = [];

  for (const g of groupSpecs) {
    const groupAssignments = assignments.filter((a) => a.groupId === g.id);
    let cursor = 0;

    for (let day = 1; day <= 6; day++) {
      const lessonsToday = day === 6 ? between(0, 2) : between(3, 5);
      for (let slot = 1; slot <= lessonsToday; slot++) {
        const key = `${day}:${slot}`;

        // Nobody teaches two groups at once. If every subject's teacher is busy
        // this period, the group simply has a free slot — as a real timetable does.
        let chosen: (typeof groupAssignments)[number] | null = null;
        for (let n = 0; n < groupAssignments.length; n++) {
          const candidate = groupAssignments[(cursor + n) % groupAssignments.length];
          if (!busyTeachers.has(`${candidate.teacherId}@${key}`)) {
            chosen = candidate;
            cursor += n + 1;
            break;
          }
        }
        if (!chosen) continue;

        const offset = Math.floor(rand() * ROOMS.length);
        let room: string | null = null;
        for (let n = 0; n < ROOMS.length; n++) {
          const candidate = ROOMS[(offset + n) % ROOMS.length];
          if (!busyRooms.has(`${candidate}@${key}`)) {
            room = candidate;
            break;
          }
        }
        if (!room) continue;

        busyTeachers.add(`${chosen.teacherId}@${key}`);
        busyRooms.add(`${room}@${key}`);
        scheduleRows.push({
          groupId: g.id,
          dayOfWeek: day,
          lessonNumber: slot,
          subgroup: "",
          subjectId: chosen.subjectId,
          teacherId: chosen.teacherId,
          room,
        });
      }
    }
  }
  await prisma.scheduleEntry.createMany({ data: scheduleRows });

  /* -- a few cover lessons and cancellations around today -- */
  const seenSubs = new Set<string>();
  const subRows = [];
  for (let i = 0; i < 10; i++) {
    const g = pick(groupSpecs);
    const date = addDays(TODAY, between(-5, 9));
    if (date.getUTCDay() === 0) continue;
    const lessonNumber = between(1, 4);
    const key = `${g.id}:${date.toISOString()}:${lessonNumber}`;
    if (seenSubs.has(key)) continue;
    seenSubs.add(key);

    const assignment = pick(assignments.filter((a) => a.groupId === g.id));
    const cancelled = chance(0.3);
    subRows.push({
      groupId: g.id,
      date,
      lessonNumber,
      subgroup: "",
      cancelled,
      subjectId: cancelled ? null : assignment.subjectId,
      teacherId: cancelled ? null : assignment.teacherId,
      room: cancelled ? null : pick(ROOMS),
    });
  }
  await prisma.scheduleSubstitution.createMany({ data: subRows });

  /* -- bell times -- */
  const bellPattern: Record<string, [string, string][]> = {
    main: [["08:00", "08:45"], ["08:55", "09:40"], ["09:50", "10:35"], ["10:45", "11:30"],
           ["12:00", "12:45"], ["12:55", "13:40"], ["14:00", "14:45"], ["14:55", "15:40"]],
    thu: [["08:00", "08:45"], ["08:55", "09:40"], ["09:50", "10:35"], ["10:45", "11:30"],
          ["12:00", "12:45"], ["12:55", "13:40"], ["14:40", "15:25"], ["15:35", "16:20"]],
    sat: [["08:00", "08:45"], ["08:55", "09:40"], ["09:50", "10:35"], ["10:45", "11:30"],
          ["11:40", "12:25"], ["12:35", "13:20"], ["13:40", "14:25"], ["14:35", "15:20"]],
  };
  await prisma.bellTime.createMany({
    data: Object.entries(bellPattern).flatMap(([dayGroup, slots]) =>
      slots.map(([startTime, endTime], i) => ({ dayGroup, number: i + 1, startTime, endTime })),
    ),
  });

  const overrideStart = addDays(TODAY, 21);
  await prisma.bellOverride.create({
    data: {
      name: "Shortened timetable — open days",
      startDate: overrideStart,
      endDate: addDays(overrideStart, 2),
      slots: {
        createMany: {
          data: [["08:00", "08:30"], ["08:40", "09:10"], ["09:20", "09:50"],
                 ["10:00", "10:30"], ["10:40", "11:10"], ["11:20", "11:50"]]
            .map(([startTime, endTime], i) => ({ number: i + 1, startTime, endTime })),
        },
      },
    },
  });

  /* -- excused absences -- */
  const seenExcused = new Set<string>();
  const excusedRows = [];
  for (let i = 0; i < 60; i++) {
    const student = pick(students);
    const date = addDays(TODAY, -between(1, 60));
    if (date.getUTCDay() === 0) continue;
    const key = `${student.id}:${date.toISOString()}`;
    if (seenExcused.has(key)) continue;
    seenExcused.add(key);
    excusedRows.push({ studentId: student.id, date });
  }
  await prisma.excusedAbsence.createMany({ data: excusedRows });

  /* -- rewards and penalties -- */
  const rewardReasons = [
    "First place in the regional programming contest",
    "Outstanding results in the semester assessment",
    "Organising the college open day",
    "Representing the college at the national skills competition",
    "Consistent excellence in laboratory work",
    "Volunteering with the first-year mentoring scheme",
  ];
  const penaltyReasons = [
    "Repeated unexcused absence from scheduled lessons",
    "Failure to submit laboratory work by the agreed deadline",
    "Breach of the computer laboratory regulations",
    "Late arrival to lessons on multiple occasions",
  ];

  let rewardNo = 0;
  let penaltyNo = 0;
  const recordRows = [];
  for (let i = 0; i < 42; i++) {
    const student = pick(students);
    const isReward = chance(0.62);
    const date = addDays(TODAY, -between(5, 210));
    const writtenOff = !isReward && chance(0.25);
    recordRows.push({
      kind: isReward ? RecordKind.REWARD : RecordKind.PENALTY,
      number: isReward ? `R-${++rewardNo}/${year}` : `P-${++penaltyNo}/${year}`,
      date,
      reason: isReward ? pick(rewardReasons) : pick(penaltyReasons),
      writtenOffAt: writtenOff ? addDays(date, between(30, 90)) : null,
      writtenOffById: writtenOff ? admin.id : null,
      studentId: student.id,
      issuedById: admin.id,
      createdAt: date,
    });
  }
  await prisma.studentRecord.createMany({ data: recordRows });

  /* -- consultations -- */
  const seenExtra = new Set<string>();
  for (let i = 0; i < 12; i++) {
    const teacher = pick(teachers);
    const date = addDays(TODAY, between(-3, 14));
    if (date.getUTCDay() === 0) continue;
    const lessonNumber = between(5, 8);
    const key = `${teacher.id}:${date.toISOString()}:${lessonNumber}`;
    if (seenExtra.has(key)) continue;
    seenExtra.add(key);

    const group = pick(groupSpecs);
    const extra = await prisma.extraLesson.create({
      data: {
        teacherId: teacher.id,
        date,
        lessonNumber,
        room: pick(ROOMS),
        comment: pick([
          "Consultation before the assessment",
          "Catch-up session for missed laboratory work",
          "Open question-and-answer session",
          "Project supervision",
        ]),
        groupId: group.id,
      },
    });

    const rsvps = (byGroup.get(group.id) ?? [])
      .filter(() => chance(0.35))
      .map((studentId) => ({ extraLessonId: extra.id, studentId }));
    if (rsvps.length) await prisma.extraLessonRsvp.createMany({ data: rsvps });
  }

  /* -- audit trail -- */
  const actions: [string, string][] = [
    ["create", "group"], ["update", "user"], ["delete", "lesson"],
    ["update", "scheduleEntry"], ["create", "assignment"], ["update", "semester"],
    ["create", "studentRecord"], ["update", "subject"], ["create", "user"],
    ["update", "bellTime"],
  ];
  const actors = [admin, ...teachers.slice(0, 4)];
  await prisma.auditLog.createMany({
    data: Array.from({ length: 48 }, () => {
      const [action, entity] = pick(actions);
      return {
        userId: pick(actors).id,
        action,
        entity,
        ipAddress: `10.0.${between(0, 4)}.${between(2, 250)}`,
        userAgent: "Mozilla/5.0 (demo)",
        createdAt: new Date(TODAY.getTime() - between(0, 45) * 86400000),
      };
    }),
  });

  await prisma.backupSetting.create({
    data: {
      id: "singleton",
      enabled: true,
      intervalHours: 24,
      keepCount: 10,
      lastBackupAt: addDays(TODAY, -1),
    },
  });

  return {
    users: 1 + teachers.length + students.length,
    groups: groupSpecs.length,
    subjects: subjectSpecs.length,
    lessons: lessonRows.length,
    grades: gradeRows.length,
    schedule: scheduleRows.length,
  };
}

/* --------------------------------- main ---------------------------------- */

async function main() {
  const args = process.argv.slice(2);
  const reset = args.includes("--reset");
  const ifEmpty = args.includes("--if-empty");

  const existing = await prisma.user.count();

  if (existing > 0 && ifEmpty) {
    console.log(`Database already holds ${existing} people — leaving it alone.`);
    return;
  }
  if (existing > 0 && !reset) {
    console.error(
      `Database already holds ${existing} people.\n` +
        "Pass --reset to wipe and re-seed, or --if-empty to do nothing.",
    );
    process.exit(1);
  }
  if (existing > 0 && reset) {
    console.log("Wiping…");
    await wipe();
  }

  console.log("Seeding…");
  const counts = await seed();
  console.log(
    `Done: ${counts.users} people, ${counts.groups} groups, ${counts.subjects} subjects, ` +
      `${counts.lessons} lessons, ${counts.grades} grades, ${counts.schedule} timetable entries.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
