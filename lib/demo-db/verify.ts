/**
 * Exercises the demo database the way the application does.
 *
 * Run with `pnpm check:demo-db`. This is the safety net for the query engine:
 * every query shape the app relies on is asserted here, so a regression in the
 * engine surfaces as a failed check rather than a blank page somewhere.
 */

import { db, resetDemoData } from "./client";

let failures = 0;
let checks = 0;

function check(label: string, condition: boolean, detail?: unknown) {
  checks += 1;
  if (condition) return;
  failures += 1;
  console.error(`  FAIL  ${label}${detail === undefined ? "" : ` — ${JSON.stringify(detail)}`}`);
}

function section(name: string) {
  console.log(`\n${name}`);
}

async function main() {
  section("seed volume");
  const [users, groups, subjects, lessons, grades, entries] = await Promise.all([
    db.user.count(),
    db.group.count(),
    db.subject.count(),
    db.lesson.count(),
    db.grade.count(),
    db.scheduleEntry.count(),
  ]);
  console.log(
    `  users=${users} groups=${groups} subjects=${subjects} lessons=${lessons} grades=${grades} schedule=${entries}`,
  );
  check("has students", users > 80, users);
  check("has groups", groups === 8, groups);
  check("has lessons", lessons > 200, lessons);
  check("has grades", grades > 1000, grades);
  check("schedule populated", entries > 100, entries);

  section("seed plausibility");
  // A demo opened months after it was built must still look alive.
  const currentSemester = await db.semester.findFirst({ where: { isCurrent: true } });
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  check("a current semester exists", !!currentSemester, currentSemester?.name);
  check(
    "the current semester contains today",
    !!currentSemester && currentSemester.startDate <= today && currentSemester.endDate >= today,
    { start: currentSemester?.startDate, today, end: currentSemester?.endDate },
  );

  const pastLessons = await db.lesson.count({
    where: { semesterId: currentSemester!.id, date: { lte: today } },
  });
  check("the current semester has lessons already taught", pastLessons > 50, pastLessons);

  // Nobody teaches two groups at once, and no room holds two lessons at once.
  const allEntries = await db.scheduleEntry.findMany();
  const teacherSlots = new Set<string>();
  const roomSlots = new Set<string>();
  let teacherClashes = 0;
  let roomClashes = 0;
  for (const entry of allEntries) {
    const slot = `${entry.dayOfWeek}:${entry.lessonNumber}`;
    const teacherKey = `${entry.teacherId}@${slot}`;
    const roomKey = `${entry.room}@${slot}`;
    if (teacherSlots.has(teacherKey)) teacherClashes += 1;
    if (roomSlots.has(roomKey)) roomClashes += 1;
    teacherSlots.add(teacherKey);
    roomSlots.add(roomKey);
  }
  check("no teacher is timetabled twice in one period", teacherClashes === 0, teacherClashes);
  check("no room is timetabled twice in one period", roomClashes === 0, roomClashes);

  section("where filters");
  const students = await db.user.findMany({ where: { role: "STUDENT" } });
  check("role equality", students.length > 80, students.length);

  const staff = await db.user.findMany({ where: { role: { in: ["ADMIN", "TEACHER"] } } });
  check("in operator", staff.length === 11, staff.length);

  const notStudents = await db.user.findMany({ where: { role: { not: "STUDENT" } } });
  check("not operator", notStudents.length === staff.length, notStudents.length);

  const named = await db.user.findMany({ where: { name: { contains: "a" } } });
  check("contains operator", named.length > 0, named.length);

  const withGroup = await db.user.findMany({ where: { groupId: { not: null } } });
  check("not null", withGroup.length === students.length, withGroup.length);

  const orFilter = await db.user.findMany({
    where: { OR: [{ role: "ADMIN" }, { role: "TEACHER" }] },
  });
  check("OR", orFilter.length === 11, orFilter.length);

  const andFilter = await db.user.findMany({
    where: { AND: [{ role: "STUDENT" }, { reportBlocked: false }] },
  });
  check("AND", andFilter.length === students.length, andFilter.length);

  section("relation filters");
  const groupsWithStudents = await db.group.findMany({
    where: { students: { some: { role: "STUDENT" } } },
  });
  check("some", groupsWithStudents.length === 8, groupsWithStudents.length);

  const groupsWithoutAdmins = await db.group.findMany({
    where: { students: { none: { role: "ADMIN" } } },
  });
  check("none", groupsWithoutAdmins.length === 8, groupsWithoutAdmins.length);

  const sdGroups = await db.group.findMany({
    where: { specialty: { abbreviation: "SD" } },
  });
  check("to-one relation filter", sdGroups.length === 3, sdGroups.length);

  section("include / select / _count");
  const groupWithEverything = await db.group.findFirst({
    where: { name: "SD-31" },
    include: {
      students: { orderBy: { name: "asc" }, take: 3 },
      curator: true,
      specialty: true,
      assignments: { include: { subject: true, teachers: true } },
    },
  });
  check("include to-many", Array.isArray(groupWithEverything?.students), typeof groupWithEverything?.students);
  check("include take", groupWithEverything?.students.length === 3, groupWithEverything?.students.length);
  check("include to-one", !!groupWithEverything?.curator?.name, groupWithEverything?.curator);
  check("nested include", !!groupWithEverything?.assignments?.[0]?.subject?.name);
  check(
    "many-to-many include",
    (groupWithEverything?.assignments?.[0]?.teachers?.length ?? 0) > 0,
    groupWithEverything?.assignments?.[0]?.teachers?.length,
  );
  const sortedNames = groupWithEverything!.students.map((s: any) => s.name);
  check(
    "include orderBy",
    JSON.stringify(sortedNames) === JSON.stringify([...sortedNames].sort()),
    sortedNames,
  );

  const selected = await db.user.findFirst({ select: { id: true, name: true } });
  check("select narrows fields", Object.keys(selected!).length === 2, Object.keys(selected!));

  const specialties = await db.specialty.findMany({
    include: { _count: { select: { subjects: true, groups: true, users: true } } },
  });
  check("_count present", typeof specialties[0]._count.groups === "number", specialties[0]._count);
  check(
    "_count accurate",
    specialties.reduce((n: number, s: any) => n + s._count.groups, 0) === 8,
    specialties.map((s: any) => s._count.groups),
  );

  section("ordering, paging, distinct");
  const byName = await db.group.findMany({ orderBy: { name: "asc" } });
  check(
    "orderBy asc",
    JSON.stringify(byName.map((g: any) => g.name)) ===
      JSON.stringify([...byName.map((g: any) => g.name)].sort()),
  );

  const multiSort = await db.scheduleEntry.findMany({
    orderBy: [{ dayOfWeek: "asc" }, { lessonNumber: "asc" }],
    take: 5,
  });
  check("multi-key orderBy", multiSort[0].dayOfWeek <= multiSort[4].dayOfWeek);

  const relationSort = await db.assignment.findMany({
    orderBy: { subject: { name: "asc" } },
    include: { subject: true },
    take: 5,
  });
  const relNames = relationSort.map((a: any) => a.subject.name);
  check(
    "relation orderBy",
    JSON.stringify(relNames) === JSON.stringify([...relNames].sort()),
    relNames,
  );

  const page = await db.user.findMany({ orderBy: { id: "asc" }, skip: 5, take: 10 });
  check("skip/take", page.length === 10, page.length);

  const distinctRooms = await db.scheduleEntry.findMany({ distinct: ["room"] });
  const roomSet = new Set(distinctRooms.map((r: any) => r.room));
  check("distinct", roomSet.size === distinctRooms.length, distinctRooms.length);

  section("groupBy");
  const byRole = await db.user.groupBy({
    by: ["role"],
    where: { isMaster: false },
    _count: true,
  });
  check("groupBy buckets", byRole.length === 3, byRole.map((r: any) => r.role));
  check(
    "groupBy counts sum",
    byRole.reduce((n: number, r: any) => n + r._count, 0) === users,
    byRole,
  );

  section("writes");
  const created = await db.subject.create({
    data: { name: "Demo Subject", isPractical: true, hours: 40 },
  });
  check("create returns row", !!created.id && created.name === "Demo Subject", created);
  check("create applies defaults", created.createdAt instanceof Date, created.createdAt);

  const updated = await db.subject.update({
    where: { id: created.id },
    data: { hours: 55 },
  });
  check("update", updated.hours === 55, updated.hours);

  const upsertedNew = await db.subject.upsert({
    where: { id: "no-such-id" },
    create: { name: "Upserted Subject" },
    update: { name: "Should not happen" },
  });
  check("upsert creates", upsertedNew.name === "Upserted Subject", upsertedNew.name);

  const upsertedExisting = await db.subject.upsert({
    where: { id: created.id },
    create: { name: "Should not happen" },
    update: { hours: 77 },
  });
  check("upsert updates", upsertedExisting.hours === 77, upsertedExisting.hours);

  section("many-to-many writes");
  const teacher = (await db.user.findFirst({ where: { role: "TEACHER" } }))!;
  await db.subject.update({
    where: { id: created.id },
    data: { teachers: { connect: [{ id: teacher.id }] } },
  });
  const linked = (await db.subject.findUnique({
    where: { id: created.id },
    include: { teachers: true },
  }))!;
  check("m2m connect", linked.teachers.length === 1, linked.teachers.length);

  await db.subject.update({ where: { id: created.id }, data: { teachers: { set: [] } } });
  const unlinked = (await db.subject.findUnique({
    where: { id: created.id },
    include: { teachers: true },
  }))!;
  check("m2m set []", unlinked.teachers.length === 0, unlinked.teachers.length);

  section("compound unique lookup");
  const anyEntry = (await db.scheduleEntry.findFirst())!;
  const byCompound = await db.scheduleEntry.findUnique({
    where: {
      groupId_dayOfWeek_lessonNumber_subgroup: {
        groupId: anyEntry.groupId,
        dayOfWeek: anyEntry.dayOfWeek,
        lessonNumber: anyEntry.lessonNumber,
        subgroup: anyEntry.subgroup,
      },
    },
  });
  check("compound unique where", byCompound?.id === anyEntry.id, byCompound?.id);

  section("cascade delete");
  const victim = (await db.group.findFirst({
    where: { name: "BA-21" },
    include: { assignments: true, students: true },
  }))!;
  const assignmentIds = victim.assignments.map((a: any) => a.id);
  const lessonsBefore = await db.lesson.count({
    where: { assignmentId: { in: assignmentIds } },
  });
  check("group has lessons before delete", lessonsBefore > 0, lessonsBefore);

  await db.group.delete({ where: { id: victim.id } });

  const lessonsAfter = await db.lesson.count({
    where: { assignmentId: { in: assignmentIds } },
  });
  check("cascade removed lessons", lessonsAfter === 0, lessonsAfter);

  const orphanedStudents = await db.user.count({ where: { groupId: victim.id } });
  check("set null on students", orphanedStudents === 0, orphanedStudents);

  const studentStillExists = await db.user.findUnique({ where: { id: victim.students[0].id } });
  check("students not deleted with group", !!studentStillExists, studentStillExists?.id);

  section("delete + reset");
  await db.subject.delete({ where: { id: created.id } });
  const goneSubject = await db.subject.findUnique({ where: { id: created.id } });
  check("delete removes row", goneSubject === null, goneSubject);

  resetDemoData();
  const groupsAfterReset = await db.group.count();
  check("reset restores seed", groupsAfterReset === 8, groupsAfterReset);

  console.log(
    `\n${failures === 0 ? "PASS" : "FAIL"} — ${checks - failures}/${checks} checks passed`,
  );
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
