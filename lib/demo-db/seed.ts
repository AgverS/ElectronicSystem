/**
 * Demo dataset for a fictional institution, "Meridian Technical College".
 *
 * Two properties matter here:
 *  - Deterministic. Every visitor sees the same college, so screenshots and
 *    walkthroughs stay reproducible.
 *  - Dated relative to today. The current semester always contains the current
 *    date, so the demo never looks abandoned however long after it was built
 *    someone opens it.
 *
 * Volume is deliberately budgeted: the whole dataset is persisted into the
 * visitor's localStorage, so grades are generated for recent lessons only.
 */

import { DemoEngine, emptyDataset, type Dataset } from "./engine";

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
/** UTC-midnight of today, matching how the rest of the app pins dates. */
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
  "Achterberg", "Quintero", "Lindholm", "Barros", "Kowalczyk", "Renner",
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

/* -------------------------------- seeding -------------------------------- */

export function buildSeed(): Dataset {
  const data = emptyDataset();
  const e = new DemoEngine(data);

  /* -- specialties -- */
  const specialtySpecs = [
    { id: "spec-sd", name: "Software Development", abbreviation: "SD", letter: "S" },
    { id: "spec-net", name: "Computer Networks & Systems", abbreviation: "CNS", letter: "N" },
    { id: "spec-des", name: "Digital Design", abbreviation: "DD", letter: "D" },
    { id: "spec-bus", name: "Business Administration", abbreviation: "BA", letter: "B" },
  ];
  for (const s of specialtySpecs) e.create("specialty", { data: s });

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

  /* -- semesters -- */
  // The current semester is anchored around today rather than to fixed calendar
  // dates. A demo opened during the summer break would otherwise present a term
  // that finished weeks ago: no lessons this week, an empty timetable, and
  // nothing happening anywhere. Anchoring guarantees roughly eleven weeks of
  // history behind today and nine weeks of scheduled work ahead of it, whenever
  // someone happens to open the link.
  const year = TODAY.getUTCFullYear();
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const currentStart = addDays(TODAY, -11 * 7);
  const currentEnd = addDays(TODAY, 9 * 7);

  /** Academic year label for a date, with the year rolling over in September. */
  const academicYearOf = (date: Date) => {
    const y = date.getUTCFullYear();
    return date.getUTCMonth() + 1 >= 9 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
  };

  // Earlier semesters step back a term at a time, giving the results and
  // history screens something real to show.
  const SEMESTER_SPAN_WEEKS = 26;
  const semesterSpecs = [3, 2, 1, 0].map((stepsBack, index) => {
    const start = new Date(currentStart.getTime() - stepsBack * SEMESTER_SPAN_WEEKS * WEEK_MS);
    const end = new Date(currentEnd.getTime() - stepsBack * SEMESTER_SPAN_WEEKS * WEEK_MS);
    return {
      id: `sem-${index + 3}`,
      number: index + 3,
      year: academicYearOf(start),
      start,
      end,
    };
  });

  const currentSemester = semesterSpecs[semesterSpecs.length - 1];

  for (const s of semesterSpecs) {
    e.create("semester", {
      data: {
        id: s.id,
        name: `Semester ${s.number}`,
        number: s.number,
        year: s.year,
        startDate: s.start,
        endDate: s.end,
        isCurrent: s.id === currentSemester.id,
        createdAt: s.start,
      },
    });
  }

  for (const s of subjectSpecs) {
    e.create("subject", {
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
  let userSeq = 0;
  const nextUserId = () => `user-${String(++userSeq).padStart(4, "0")}`;

  const admin = e.create("user", {
    data: {
      id: nextUserId(),
      name: "Helena Ward",
      username: "h.ward",
      email: "h.ward@meridian.example",
      role: "ADMIN",
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

  const teachers = teacherSpecs.map((t, i) => {
    const [first, last] = t.name.split(" ");
    return e.create("user", {
      data: {
        id: nextUserId(),
        name: t.name,
        username: `${first[0].toLowerCase()}.${last.toLowerCase()}`,
        email: `${first[0].toLowerCase()}.${last.toLowerCase()}@meridian.example`,
        role: "TEACHER",
        calendarToken: `demo-token-teacher-${i + 1}`,
        subjects: { connect: t.subjects.map((id) => ({ id })) },
        specialties: { connect: t.specs.map((id) => ({ id })) },
      },
    });
  });

  const teacherBySubject = (subjectId: string) => {
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

  for (const g of groupSpecs) {
    e.create("group", {
      data: {
        id: g.id,
        name: g.name,
        year: g.year,
        specialtyId: g.specialtyId,
        curatorId: teachers[g.curator].id,
      },
    });
  }

  /* -- students -- */
  const usedNames = new Set<string>();
  const students: { id: string; groupId: string }[] = [];

  for (const g of groupSpecs) {
    const size = between(12, 16);
    for (let i = 0; i < size; i++) {
      let name = "";
      for (let attempt = 0; attempt < 40; attempt++) {
        const candidate = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
        if (!usedNames.has(candidate)) {
          name = candidate;
          break;
        }
      }
      if (!name) name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)} ${students.length}`;
      usedNames.add(name);

      const [first, last] = name.split(" ");
      const id = nextUserId();
      e.create("user", {
        data: {
          id,
          name,
          username: `${first[0].toLowerCase()}.${last.toLowerCase()}${between(10, 99)}`,
          email: `${first[0].toLowerCase()}.${last.toLowerCase()}@students.meridian.example`,
          role: "STUDENT",
          groupId: g.id,
          calendarToken: `demo-token-${id}`,
          reportBlocked: false,
        },
      });
      students.push({ id, groupId: g.id });
    }
  }

  /* -- assignments (group x subject, with teachers) -- */
  const assignments: { id: string; groupId: string; subjectId: string; teacherId: string }[] = [];

  for (const g of groupSpecs) {
    for (const subjectId of g.subjects) {
      const teacherId = teacherBySubject(subjectId);
      const subject = subjectSpecs.find((s) => s.id === subjectId)!;
      const created = e.create("assignment", {
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
  // Graded history covers the current semester up to today, plus a slice of the
  // previous semester so the "past results" views have something to show.
  const previousSemester =
    semesterSpecs[semesterSpecs.findIndex((s) => s.id === currentSemester.id) - 1] ??
    semesterSpecs[0];

  const GRADE_POOL = ["4", "5", "5", "6", "6", "7", "7", "7", "8", "8", "9", "9", "10", "3", "AB"];

  const studentsByGroup = new Map<string, string[]>();
  for (const s of students) {
    const list = studentsByGroup.get(s.groupId) ?? [];
    list.push(s.id);
    studentsByGroup.set(s.groupId, list);
  }

  function generateLessons(
    semester: (typeof semesterSpecs)[number],
    assignment: (typeof assignments)[number],
    maxLessons: number,
    gradeRatio: number,
  ) {
    const subject = subjectSpecs.find((s) => s.id === assignment.subjectId)!;
    const topics = LESSON_TOPICS[subject.topics] ?? LESSON_TOPICS.general;
    const groupStudents = studentsByGroup.get(assignment.groupId) ?? [];

    // One lesson a week on a stable weekday for this assignment.
    const weekday = 1 + (assignment.id.charCodeAt(assignment.id.length - 1) % 5);
    let cursor = new Date(semester.start);
    while (cursor.getUTCDay() !== weekday) cursor = addDays(cursor, 1);

    const horizon = semester.end < TODAY ? semester.end : TODAY;
    let index = 0;

    while (cursor <= horizon && index < maxLessons) {
      const type: string = subject.isPractical
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

      const lesson = e.create("lesson", {
        data: {
          date: new Date(cursor),
          topic: topics[index % topics.length],
          type,
          deadline: type === "lab" ? addDays(cursor, 14) : null,
          assignmentId: assignment.id,
          semesterId: semester.id,
          createdAt: new Date(cursor),
        },
      });

      // Not every student is marked at every lesson — blank cells are normal.
      for (const studentId of groupStudents) {
        if (!chance(gradeRatio)) continue;
        const value = chance(0.08) ? "AB" : pick(GRADE_POOL.filter((g) => g !== "AB"));
        e.create("grade", {
          data: {
            value,
            lateness: value !== "AB" && chance(0.06) ? between(3, 20) : null,
            retakeNumber: 0,
            lessonId: lesson.id,
            studentId,
            createdAt: new Date(cursor),
          },
        });
      }

      cursor = addDays(cursor, 7);
      index += 1;
    }
  }

  for (const assignment of assignments) {
    generateLessons(currentSemester, assignment, 14, 0.62);
    generateLessons(previousSemester, assignment, 5, 0.5);
  }

  /* -- weekly schedule -- */
  // Occupancy of teachers and rooms, keyed by "day:period".
  const busyTeachers = new Set<string>();
  const busyRooms = new Set<string>();
  const slotKey = (day: number, period: number) => `${day}:${period}`;

  const isTeacherBusy = (teacherId: string, day: number, period: number) =>
    busyTeachers.has(`${teacherId}@${slotKey(day, period)}`);
  const occupyTeacher = (teacherId: string, day: number, period: number) =>
    busyTeachers.add(`${teacherId}@${slotKey(day, period)}`);
  const occupyRoom = (room: string, day: number, period: number) =>
    busyRooms.add(`${room}@${slotKey(day, period)}`);
  const freeRoom = (day: number, period: number) => {
    const offset = Math.floor(rand() * ROOMS.length);
    for (let i = 0; i < ROOMS.length; i++) {
      const room = ROOMS[(offset + i) % ROOMS.length];
      if (!busyRooms.has(`${room}@${slotKey(day, period)}`)) return room;
    }
    return null;
  };

  for (const g of groupSpecs) {
    const groupAssignments = assignments.filter((a) => a.groupId === g.id);
    let cursor = 0;
    for (let day = 1; day <= 6; day++) {
      const lessonsToday = day === 6 ? between(0, 2) : between(3, 5);
      for (let slot = 1; slot <= lessonsToday; slot++) {
        // Nobody can teach two groups at once, and no room holds two lessons at
        // once. Try each of the group's subjects until one whose teacher is free
        // turns up; if they are all busy this period, the group simply has a
        // free slot, exactly as a real timetable would.
        let assignment: (typeof groupAssignments)[number] | null = null;
        for (let attempt = 0; attempt < groupAssignments.length; attempt++) {
          const candidate = groupAssignments[(cursor + attempt) % groupAssignments.length];
          if (!isTeacherBusy(candidate.teacherId, day, slot)) {
            assignment = candidate;
            cursor += attempt + 1;
            break;
          }
        }
        if (!assignment) continue;

        const room = freeRoom(day, slot);
        if (!room) continue;

        occupyTeacher(assignment.teacherId, day, slot);
        occupyRoom(room, day, slot);

        e.create("scheduleEntry", {
          data: {
            groupId: g.id,
            dayOfWeek: day,
            lessonNumber: slot,
            subgroup: "",
            subjectId: assignment.subjectId,
            teacherId: assignment.teacherId,
            room,
          },
        });
      }
    }
  }

  /* -- a few substitutions and cancellations around today -- */
  for (let i = 0; i < 10; i++) {
    const g = pick(groupSpecs);
    const date = addDays(TODAY, between(-5, 9));
    if (date.getUTCDay() === 0) continue;
    const groupAssignments = assignments.filter((a) => a.groupId === g.id);
    const assignment = pick(groupAssignments);
    const cancelled = chance(0.3);
    e.create("scheduleSubstitution", {
      data: {
        groupId: g.id,
        date,
        lessonNumber: between(1, 4),
        subgroup: "",
        cancelled,
        subjectId: cancelled ? null : assignment.subjectId,
        teacherId: cancelled ? null : assignment.teacherId,
        room: cancelled ? null : pick(ROOMS),
      },
    });
  }

  /* -- bell times -- */
  const bellPattern: Record<string, [string, string][]> = {
    main: [
      ["08:00", "08:45"], ["08:55", "09:40"], ["09:50", "10:35"], ["10:45", "11:30"],
      ["12:00", "12:45"], ["12:55", "13:40"], ["14:00", "14:45"], ["14:55", "15:40"],
    ],
    thu: [
      ["08:00", "08:45"], ["08:55", "09:40"], ["09:50", "10:35"], ["10:45", "11:30"],
      ["12:00", "12:45"], ["12:55", "13:40"], ["14:40", "15:25"], ["15:35", "16:20"],
    ],
    sat: [
      ["08:00", "08:45"], ["08:55", "09:40"], ["09:50", "10:35"], ["10:45", "11:30"],
      ["11:40", "12:25"], ["12:35", "13:20"], ["13:40", "14:25"], ["14:35", "15:20"],
    ],
  };
  for (const [dayGroup, slots] of Object.entries(bellPattern)) {
    slots.forEach(([startTime, endTime], i) => {
      e.create("bellTime", { data: { dayGroup, number: i + 1, startTime, endTime } });
    });
  }

  // A shortened-timetable period, to show the override feature in use.
  const overrideStart = addDays(TODAY, 21);
  e.create("bellOverride", {
    data: {
      name: "Shortened timetable — open days",
      startDate: overrideStart,
      endDate: addDays(overrideStart, 2),
      slots: {
        createMany: {
          data: [
            ["08:00", "08:30"], ["08:40", "09:10"], ["09:20", "09:50"], ["10:00", "10:30"],
            ["10:40", "11:10"], ["11:20", "11:50"],
          ].map(([startTime, endTime], i) => ({ number: i + 1, startTime, endTime })),
        },
      },
    },
  });

  /* -- excused absences -- */
  for (let i = 0; i < 60; i++) {
    const student = pick(students);
    const date = addDays(TODAY, -between(1, 60));
    if (date.getUTCDay() === 0) continue;
    e.create("excusedAbsence", { data: { studentId: student.id, date } });
  }

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
  for (let i = 0; i < 42; i++) {
    const student = pick(students);
    const isReward = chance(0.62);
    const date = addDays(TODAY, -between(5, 210));
    const writtenOff = !isReward && chance(0.25);
    e.create("studentRecord", {
      data: {
        kind: isReward ? "REWARD" : "PENALTY",
        number: isReward ? `R-${++rewardNo}/${year}` : `P-${++penaltyNo}/${year}`,
        date,
        reason: isReward ? pick(rewardReasons) : pick(penaltyReasons),
        writtenOffAt: writtenOff ? addDays(date, between(30, 90)) : null,
        writtenOffById: writtenOff ? admin.id : null,
        studentId: student.id,
        issuedById: admin.id,
        createdAt: date,
      },
    });
  }

  /* -- extra lessons (consultations) -- */
  for (let i = 0; i < 12; i++) {
    const teacher = pick(teachers);
    const date = addDays(TODAY, between(-3, 14));
    if (date.getUTCDay() === 0) continue;
    const group = pick(groupSpecs);
    try {
      const extra = e.create("extraLesson", {
        data: {
          teacherId: teacher.id,
          date,
          lessonNumber: between(5, 8),
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
      const groupStudents = studentsByGroup.get(group.id) ?? [];
      for (const studentId of groupStudents) {
        if (chance(0.35)) {
          e.create("extraLessonRsvp", { data: { extraLessonId: extra.id, studentId } });
        }
      }
    } catch {
      // Duplicate teacher/date/slot — skip it.
    }
  }

  /* -- audit trail -- */
  const auditActions: [string, string][] = [
    ["create", "group"], ["update", "user"], ["delete", "lesson"],
    ["update", "scheduleEntry"], ["create", "assignment"], ["update", "semester"],
    ["create", "studentRecord"], ["update", "subject"], ["create", "user"],
    ["update", "bellTime"],
  ];
  const auditActors = [admin, ...teachers.slice(0, 4)];
  for (let i = 0; i < 48; i++) {
    const [action, entity] = pick(auditActions);
    e.create("auditLog", {
      data: {
        userId: pick(auditActors).id,
        action,
        entity,
        entityId: null,
        meta: null,
        ipAddress: `10.0.${between(0, 4)}.${between(2, 250)}`,
        userAgent: "Mozilla/5.0 (demo)",
        createdAt: new Date(TODAY.getTime() - between(0, 45) * 86400000 - between(0, 86399) * 1000),
      },
    });
  }

  /* -- backup settings -- */
  e.create("backupSetting", {
    data: {
      id: "singleton",
      enabled: true,
      intervalHours: 24,
      keepCount: 10,
      lastBackupAt: addDays(TODAY, -1),
    },
  });

  return data;
}
