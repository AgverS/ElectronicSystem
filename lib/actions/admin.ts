import { prisma } from "@/lib/prisma";
import { ABSENT } from "@/lib/grades";
import { translate } from "@/lib/i18n/translate";
import { requireRole } from "@/lib/demo-actor";
import { Role } from "@/lib/prisma-client";
import { logAction } from "@/lib/audit";
import { getCurrentSemesterId } from "@/lib/semester";

async function checkAdmin() {
  const user = await requireRole(Role.ADMIN);
  if (!user) throw new Error(translate("errors.accessDenied"));
  return user;
}

export async function getAdminScope(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      isMaster: true,
      specialties: { select: { id: true } },
    },
  });
  if (!user) return null;
  return {
    isMaster: user.isMaster,
    specialtyIds: user.specialties.map((s) => s.id),
  };
}

async function canManageSpecialties(actor: { id: string; isMaster: boolean }) {
  if (actor.isMaster) return true;
  const totalCount = await prisma.specialty.count();
  if (totalCount === 0) return true;
  const scope = await getAdminScope(actor.id);
  return scope?.specialtyIds.length === totalCount;
}

// Users
export async function createUser(data: {
  name: string;
  username: string;
  role: Role;
  groupId?: string;
  specialtyIds?: string[];
  subjectIds?: string[];
  curatedGroupIds?: string[];
}) {
  const actor = await checkAdmin();
  if (!actor.isMaster && data.role === Role.ADMIN) {
    throw new Error(translate("errors.cannotCreateAdmin"));
  }
  const groupId = data.role === Role.STUDENT ? (data.groupId ?? null) : null;
  const specIds =
    data.role === Role.STUDENT
      ? []
      : [...new Set(data.specialtyIds ?? [])].filter(Boolean);
  const subjIds =
    data.role === Role.STUDENT
      ? []
      : [...new Set(data.subjectIds ?? [])].filter(Boolean);
  const curatedIds =
    data.role === Role.STUDENT
      ? []
      : [...new Set(data.curatedGroupIds ?? [])].filter(Boolean);

  const username = data.username.trim();
  const existing = await prisma.user.findUnique({
    where: { username },
  });
  if (existing) throw new Error(translate("errors.usernameExists"));

  const user = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      name: data.name.trim(),
      username,
      emailVerified: false,
      role: data.role,
      groupId,
      specialties: { connect: specIds.map((id) => ({ id })) },
      subjects: { connect: subjIds.map((id) => ({ id })) },
      curatedGroups: { connect: curatedIds.map((id) => ({ id })) },
    },
  });
  await logAction({
    userId: actor.id,
    action: "CREATE_USER",
    entity: "user",
    entityId: user.id,
    meta: {
      name: data.name,
      username: data.username,
      role: data.role,
      groupId: data.groupId ?? null,
      specialtyIds: specIds,
      subjectIds: subjIds,
      curatedGroupIds: curatedIds,
    },
  });
}

export async function updateUser(
  id: string,
  data: {
    name: string;
    username: string;
    role: Role;
    groupId?: string;
    specialtyIds?: string[];
    subjectIds?: string[];
    curatedGroupIds?: string[];
  },
) {
  const actor = await checkAdmin();
  const target = await prisma.user.findUnique({
    where: { id },
    select: {
      name: true,
      username: true,
      role: true,
      groupId: true,
      isMaster: true,
    },
  });
  if (!actor.isMaster) {
    if (id === actor.id) throw new Error(translate("errors.cannotEditOwnAccount"));
    if (target?.role === Role.ADMIN || target?.isMaster)
      throw new Error(translate("errors.noAccessToAccount"));
    if (data.role === Role.ADMIN)
      throw new Error(translate("errors.cannotAssignAdmin"));
  }

  const groupId = data.role === Role.STUDENT ? (data.groupId ?? null) : null;
  const specIds =
    data.role === Role.STUDENT
      ? []
      : [...new Set(data.specialtyIds ?? [])].filter(Boolean);
  const subjIds =
    data.role === Role.STUDENT
      ? []
      : [...new Set(data.subjectIds ?? [])].filter(Boolean);
  const curatedIds =
    data.role === Role.STUDENT
      ? []
      : [...new Set(data.curatedGroupIds ?? [])].filter(Boolean);

  const username = data.username.trim();
  const existing = await prisma.user.findUnique({
    where: { username },
  });
  if (existing && existing.id !== id) {
    throw new Error(translate("errors.usernameExists"));
  }

  await prisma.user.update({
    where: { id },
    data: {
      name: data.name.trim(),
      username,
      role: data.role,
      groupId,
      specialties: { set: specIds.map((sid) => ({ id: sid })) },
      subjects: { set: subjIds.map((sid) => ({ id: sid })) },
      curatedGroups: { set: curatedIds.map((cid) => ({ id: cid })) },
    },
  });
  await logAction({
    userId: actor.id,
    action: "UPDATE_USER",
    entity: "user",
    entityId: id,
    meta: {
      before: target,
      after: {
        name: data.name,
        username: data.username,
        role: data.role,
        groupId: data.groupId ?? null,
        specialtyIds: specIds,
        subjectIds: subjIds,
        curatedGroupIds: curatedIds,
      },
    },
  });
}

export async function deleteUser(id: string) {
  const actor = await checkAdmin();
  const user = await prisma.user.findUnique({
    where: { id },
    select: { name: true, username: true, role: true, isMaster: true },
  });
  if (user?.isMaster) throw new Error(translate("errors.cannotDeleteSystemAccount"));
  if (!actor.isMaster) {
    if (id === actor.id) throw new Error(translate("errors.cannotDeleteOwnAccount"));
    if (user?.role === Role.ADMIN)
      throw new Error(translate("errors.noAccessToAccount"));
  }
  await prisma.group.updateMany({
    where: { curatorId: id },
    data: { curatorId: null },
  });
  await prisma.scheduleEntry.deleteMany({ where: { teacherId: id } });
  await prisma.user.update({ where: { id }, data: { groupId: null } });
  await prisma.user.delete({ where: { id } });
  await prisma.assignment.deleteMany({
    where: {
      teachers: {
        none: {},
      },
    },
  });
  await logAction({
    userId: actor.id,
    action: "DELETE_USER",
    entity: "user",
    entityId: id,
    meta: { name: user?.name, username: user?.username, role: user?.role },
  });
}

export async function checkUsernameAvailability(username: string) {
  const user = await prisma.user.findUnique({
    where: { username: username.trim() },
    select: { id: true },
  });
  return !user;
}

export async function resetUserPassword(id: string) {
  const actor = await checkAdmin();
  const user = await prisma.user.findUnique({
    where: { id },
    select: { name: true, username: true, role: true, isMaster: true },
  });

  if (user?.isMaster)
    throw new Error(translate("errors.cannotResetSystemAccount"));
  if (!actor.isMaster) {
    if (user?.role === Role.ADMIN)
      throw new Error(translate("errors.noAccessToAccount"));
  }

  // In the full system this clears the stored credential and ends the user's
  // sessions, so they set a new password on next sign-in. The demo has no
  // accounts to clear — the action is kept so the flow is still demonstrable,
  // and it records the same audit entry.

  await logAction({
    userId: actor.id,
    action: "RESET_PASSWORD",
    entity: "user",
    entityId: id,
    meta: { name: user?.name, username: user?.username },
  });
}

export async function createUsers(
  users: {
    name: string;
    username: string;
    role: Role;
    groupId?: string;
    curatedGroupId?: string;
    specialtyIds?: string[];
  }[],
): Promise<{ results: Array<{ ok: boolean; error?: string }> }> {
  const actor = await checkAdmin();
  if (!actor.isMaster && users.some((u) => u.role === Role.ADMIN)) {
    throw new Error(translate("errors.cannotCreateAdmin"));
  }

  const results: Array<{ ok: boolean; error?: string }> = [];
  const batchUsernames = new Set<string>();

  for (const u of users) {
    try {
      const username = u.username.trim();
      const name = u.name.trim();

      if (batchUsernames.has(username)) {
        results.push({ ok: false, error: translate("errors.duplicateInList") });
        continue;
      }
      batchUsernames.add(username);

      const groupId = u.role === Role.STUDENT ? (u.groupId ?? null) : null;

      // Explicit check for better UX
      const existing = await prisma.user.findUnique({
        where: { username },
        select: { id: true },
      });
      if (existing) {
        results.push({ ok: false, error: translate("errors.usernameTaken") });
        continue;
      }

      // For a teacher or administrator, the chosen group is one they curate.
      const curatedId = u.role !== Role.STUDENT ? (u.curatedGroupId ?? null) : null;
      const specIds =
        u.role === Role.STUDENT
          ? []
          : [...new Set(u.specialtyIds ?? [])].filter(Boolean);

      const user = await prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          name,
          username,
          emailVerified: false,
          role: u.role,
          groupId,
          ...(curatedId
            ? { curatedGroups: { connect: { id: curatedId } } }
            : {}),
          specialties: { connect: specIds.map((id) => ({ id })) },
        },
      });
      await logAction({
        userId: actor.id,
        action: "CREATE_USER",
        entity: "user",
        entityId: user.id,
        meta: {
          name: u.name,
          username: u.username,
          role: u.role,
          groupId: u.groupId ?? null,
          curatedGroupId: curatedId,
          specialtyIds: specIds,
        },
      });
      results.push({ ok: true });
    } catch (err) {
      const isUnique = (err as { code?: string })?.code === "P2002";
      results.push({
        ok: false,
        error: isUnique ? translate("errors.usernameTaken") : translate("errors.createFailed"),
      });
    }
  }
  return { results };
}

// Groups
export async function createGroup(data: {
  name: string;
  curatorId?: string;
  specialtyId?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const actor = await checkAdmin();

  // Errors come back as a value rather than a throw: in production Next.js hides
  // exception messages, leaving the user with a generic placeholder.
  try {
    const existing = await prisma.group.findUnique({
      where: { name: data.name },
    });
    if (existing)
      return {
        ok: false,
        error:
          translate("ui.aGroupWithThisNameAlreadyExistsPossibly"),
      };

    // The year comes from the group's name (see lib/group-course); it is not stored.
    const group = await prisma.group.create({
      data: {
        name: data.name,
        curatorId: data.curatorId ?? null,
        specialtyId: data.specialtyId ?? null,
      },
    });
    await logAction({
      userId: actor.id,
      action: "CREATE_GROUP",
      entity: "group",
      entityId: group.id,
      meta: {
        name: data.name,
        curatorId: data.curatorId ?? null,
        specialtyId: data.specialtyId ?? null,
      },
    });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : translate("errors.groupCreateFailed"),
    };
  }
}

export async function createGroupsBulk(
  groups: { name: string; specialtyId?: string }[],
): Promise<{ results: Array<{ ok: boolean; error?: string; name: string }> }> {
  const actor = await checkAdmin();
  const results: Array<{ ok: boolean; error?: string; name: string }> = [];
  for (const g of groups) {
    try {
      const created = await prisma.group.create({
        data: {
          name: g.name,
          curatorId: null,
          specialtyId: g.specialtyId ?? null,
        },
      });
      await logAction({
        userId: actor.id,
        action: "CREATE_GROUP",
        entity: "group",
        entityId: created.id,
        meta: { name: g.name, specialtyId: g.specialtyId ?? null, bulk: true },
      });
      results.push({ ok: true, name: g.name });
    } catch (err) {
      const isUnique = (err as { code?: string })?.code === "P2002";
      results.push({
        ok: false,
        name: g.name,
        error: isUnique ? translate("errors.groupExists") : translate("errors.createFailed"),
      });
    }
  }
  return { results };
}

export async function updateGroup(
  id: string,
  data: { name: string; curatorId?: string; specialtyId?: string },
) {
  const actor = await checkAdmin();

  const existing = await prisma.group.findUnique({ where: { name: data.name } });
  if (existing && existing.id !== id) {
    throw new Error(translate("errors.groupNameTaken"));
  }

  const before = await prisma.group.findUnique({
    where: { id },
    select: { name: true, curatorId: true, specialtyId: true },
  });
  await prisma.group.update({
    where: { id },
    data: {
      name: data.name,
      curatorId: data.curatorId ?? null,
      specialtyId: data.specialtyId ?? null,
    },
  });
  await logAction({
    userId: actor.id,
    action: "UPDATE_GROUP",
    entity: "group",
    entityId: id,
    meta: {
      before,
      after: {
        name: data.name,
        curatorId: data.curatorId ?? null,
        specialtyId: data.specialtyId ?? null,
      },
    },
  });
}

export async function deleteGroup(id: string) {
  const actor = await checkAdmin();
  const group = await prisma.group.findUnique({
    where: { id },
    select: { name: true },
  });
  await prisma.user.updateMany({
    where: { groupId: id },
    data: { groupId: null },
  });
  await prisma.assignment.deleteMany({ where: { groupId: id } });
  await prisma.group.delete({ where: { id } });
  await logAction({
    userId: actor.id,
    action: "DELETE_GROUP",
    entity: "group",
    entityId: id,
    meta: { name: group?.name },
  });
}

// Subjects
function normalizeHours(hours: number | null | undefined): number | null {
  if (hours == null) return null;
  if (!Number.isInteger(hours) || hours < 0) {
    throw new Error(translate("errors.hoursInvalid"));
  }
  return hours === 0 ? null : hours;
}

// Hours count only for the semester they were set in; stamp it (or clear).
async function hoursSemesterStamp(hours: number | null): Promise<string | null> {
  if (hours == null) return null;
  const semesterId = await getCurrentSemesterId();
  if (!semesterId) {
    throw new Error(translate("errors.createSemesterFirst"));
  }
  return semesterId;
}

export async function createSubject(data: {
  name: string;
  isPractical: boolean;
  hours?: number | null;
  specialtyIds?: string[];
}) {
  const actor = await checkAdmin();
  const ids = [...new Set(data.specialtyIds ?? [])].filter(Boolean);
  const hours = normalizeHours(data.hours);
  const hoursSemesterId = await hoursSemesterStamp(hours);

  const existing = await prisma.subject.findUnique({
    where: { name: data.name },
    select: { id: true },
  });

  if (existing) {
    // If the subject exists already, merge the new specialties into it.
    await prisma.subject.update({
      where: { id: existing.id },
      data: {
        specialties: { connect: ids.map((id) => ({ id })) },
      },
    });
    await logAction({
      userId: actor.id,
      action: "UPDATE_SUBJECT",
      entity: "subject",
      entityId: existing.id,
      meta: { name: data.name, addedSpecialtyIds: ids, merged: true },
    });
  } else {
    const subject = await prisma.subject.create({
      data: {
        name: data.name,
        isPractical: data.isPractical,
        hours,
        hoursSemesterId,
        specialties: ids.length
          ? { connect: ids.map((id) => ({ id })) }
          : undefined,
      },
    });
    await logAction({
      userId: actor.id,
      action: "CREATE_SUBJECT",
      entity: "subject",
      entityId: subject.id,
      meta: {
        name: data.name,
        isPractical: data.isPractical,
        hours,
        specialtyIds: ids,
      },
    });
  }
}

export async function updateSubject(
  id: string,
  data: {
    name: string;
    isPractical: boolean;
    hours?: number | null;
    specialtyIds?: string[];
  },
) {
  const actor = await checkAdmin();

  const existing = await prisma.subject.findUnique({ where: { name: data.name } });
  if (existing && existing.id !== id) {
    throw new Error(translate("errors.subjectNameTaken"));
  }

  const ids = [...new Set(data.specialtyIds ?? [])].filter(Boolean);
  const hours = normalizeHours(data.hours);
  const hoursSemesterId = await hoursSemesterStamp(hours);
  const before = await prisma.subject.findUnique({
    where: { id },
    select: { name: true, isPractical: true, hours: true },
  });
  await prisma.subject.update({
    where: { id },
    data: {
      name: data.name,
      isPractical: data.isPractical,
      hours,
      hoursSemesterId,
      specialties: { set: ids.map((sid) => ({ id: sid })) },
    },
  });
  await logAction({
    userId: actor.id,
    action: "UPDATE_SUBJECT",
    entity: "subject",
    entityId: id,
    meta: {
      before,
      after: { name: data.name, isPractical: data.isPractical, hours },
      specialtyIds: ids,
    },
  });
}

export async function deleteSubject(id: string) {
  const actor = await checkAdmin();
  const subject = await prisma.subject.findUnique({
    where: { id },
    select: { name: true },
  });
  await prisma.assignment.deleteMany({ where: { subjectId: id } });
  await prisma.subject.delete({ where: { id } });
  await logAction({
    userId: actor.id,
    action: "DELETE_SUBJECT",
    entity: "subject",
    entityId: id,
    meta: { name: subject?.name },
  });
}

// Specialties
export async function createSpecialty(data: { name: string; letter: string; abbreviation?: string }) {
  const actor = await checkAdmin();
  if (!(await canManageSpecialties(actor)))
    throw new Error(translate("errors.insufficientRights"));
  const name = data.name.trim();
  if (!name) throw new Error(translate("errors.specialtyNameRequired"));

  const existing = await prisma.specialty.findUnique({ where: { name } });
  if (existing) throw new Error(translate("errors.specialtyNameTaken"));

  const letter = data.letter.trim().toUpperCase().slice(0, 1);
  const abbreviation = data.abbreviation?.trim() || name.split(/\s+/).filter(w => w.length > 2).map(w => w[0]).join("").toUpperCase();
  const specialty = await prisma.specialty.create({ data: { name, letter, abbreviation } });
  await logAction({
    userId: actor.id,
    action: "CREATE_SPECIALTY",
    entity: "specialty",
    entityId: specialty.id,
    meta: { name, letter, abbreviation },
  });
}

export async function updateSpecialty(
  id: string,
  data: { name: string; letter: string; abbreviation?: string },
) {
  const actor = await checkAdmin();
  if (!(await canManageSpecialties(actor)))
    throw new Error(translate("errors.insufficientRights"));
  const name = data.name.trim();
  if (!name) throw new Error(translate("errors.specialtyNameRequired"));

  const existing = await prisma.specialty.findUnique({ where: { name } });
  if (existing && existing.id !== id) {
    throw new Error(translate("errors.specialtyNameTaken"));
  }

  const letter = data.letter.trim().toUpperCase().slice(0, 1);
  const abbreviation = data.abbreviation?.trim() || name.split(/\s+/).filter(w => w.length > 2).map(w => w[0]).join("").toUpperCase();
  const before = await prisma.specialty.findUnique({
    where: { id },
    select: { name: true, letter: true, abbreviation: true },
  });
  await prisma.specialty.update({ where: { id }, data: { name, letter, abbreviation } });
  await logAction({
    userId: actor.id,
    action: "UPDATE_SPECIALTY",
    entity: "specialty",
    entityId: id,
    meta: { before, after: { name, letter, abbreviation } },
  });
}

export async function deleteSpecialty(id: string) {
  const actor = await checkAdmin();
  if (!(await canManageSpecialties(actor)))
    throw new Error(translate("errors.insufficientRights"));
  const specialty = await prisma.specialty.findUnique({
    where: { id },
    select: { name: true },
  });
  // The many-to-many links to subjects and people cascade through the join tables.
  await prisma.specialty.delete({ where: { id } });
  await logAction({
    userId: actor.id,
    action: "DELETE_SPECIALTY",
    entity: "specialty",
    entityId: id,
    meta: { name: specialty?.name },
  });
}

// Semesters
async function checkSemesterOverlap(startDate: Date, endDate: Date, excludeId?: string) {
  const overlap = await prisma.semester.findFirst({
    where: {
      id: excludeId ? { not: excludeId } : undefined,
      AND: [
        { startDate: { lte: endDate } },
        { endDate: { gte: startDate } },
      ],
    },
  });
  if (overlap) {
    throw new Error(
      translate("semester.overlaps", {
        name: overlap.name,
        start: overlap.startDate.toISOString().slice(0, 10),
        end: overlap.endDate.toISOString().slice(0, 10),
      }),
    );
  }
}

export async function createSemester(data: {
  name: string;
  number: number;
  year: string;
  startDate: string;
  endDate: string;
  isCurrent?: boolean;
}) {
  const actor = await checkAdmin();

  const existing = await prisma.semester.findUnique({
    where: { number_year: { number: data.number, year: data.year } },
  });
  if (existing)
    throw new Error(
      translate("ui.semesterExists", { number: data.number, year: data.year }),
    );

  const sDate = new Date(data.startDate);
  const eDate = new Date(data.endDate);

  if (sDate > eDate) throw new Error(translate("ui.theStartDateMustComeBeforeTheEnd"));
  await checkSemesterOverlap(sDate, eDate);

  if (data.isCurrent) {
    await prisma.semester.updateMany({ data: { isCurrent: false } });
  }
  const semester = await prisma.semester.create({
    data: {
      name: data.name,
      number: data.number,
      year: data.year,
      startDate: sDate,
      endDate: eDate,
      isCurrent: !!data.isCurrent,
    },
  });
  await logAction({
    userId: actor.id,
    action: "CREATE_SEMESTER",
    entity: "semester",
    entityId: semester.id,
    meta: {
      name: data.name,
      number: data.number,
      year: data.year,
      startDate: data.startDate,
      endDate: data.endDate,
      isCurrent: !!data.isCurrent,
    },
  });
}

export async function updateSemester(
  id: string,
  data: {
    name: string;
    number: number;
    year: string;
    startDate: string;
    endDate: string;
    isCurrent?: boolean;
  },
) {
  const actor = await checkAdmin();

  const existing = await prisma.semester.findUnique({
    where: { number_year: { number: data.number, year: data.year } },
  });
  if (existing && existing.id !== id)
    throw new Error(
      translate("ui.semesterExists", { number: data.number, year: data.year }),
    );

  const sDate = new Date(data.startDate);
  const eDate = new Date(data.endDate);

  if (sDate > eDate) throw new Error(translate("ui.theStartDateMustComeBeforeTheEnd"));
  await checkSemesterOverlap(sDate, eDate, id);

  if (data.isCurrent) {
    await prisma.semester.updateMany({ data: { isCurrent: false } });
  }
  const before = await prisma.semester.findUnique({
    where: { id },
    select: { name: true, number: true, year: true, isCurrent: true },
  });
  await prisma.semester.update({
    where: { id },
    data: {
      name: data.name,
      number: data.number,
      year: data.year,
      startDate: sDate,
      endDate: eDate,
      isCurrent: !!data.isCurrent,
    },
  });
  await logAction({
    userId: actor.id,
    action: "UPDATE_SEMESTER",
    entity: "semester",
    entityId: id,
    meta: {
      before,
      after: {
        name: data.name,
        number: data.number,
        year: data.year,
        isCurrent: !!data.isCurrent,
      },
    },
  });
}

export async function deleteSemester(id: string) {
  const actor = await checkAdmin();
  const semester = await prisma.semester.findUnique({
    where: { id },
    select: { name: true, number: true, year: true },
  });
  // Lessons cascade to Grades, so deleting lessons is enough
  await prisma.lesson.deleteMany({ where: { semesterId: id } });
  await prisma.semester.delete({ where: { id } });
  await logAction({
    userId: actor.id,
    action: "DELETE_SEMESTER",
    entity: "semester",
    entityId: id,
    meta: {
      name: semester?.name,
      number: semester?.number,
      year: semester?.year,
    },
  });
}

// Assignments
export async function createAssignment(data: {
  teacherIds: string[];
  subjectId: string;
  groupIds: string[];
}) {
  const actor = await checkAdmin();
  const groupIds = [...new Set(data.groupIds)].filter(Boolean);
  const teacherIds = [...new Set(data.teacherIds)].filter(Boolean);
  if (teacherIds.length === 0 || !data.subjectId || groupIds.length === 0) {
    throw new Error(translate("errors.pickTeacherSubjectGroup"));
  }

  let created = 0;
  let updated = 0;

  for (const groupId of groupIds) {
    const existing = await prisma.assignment.findUnique({
      where: {
        groupId_subjectId: {
          groupId,
          subjectId: data.subjectId,
        },
      },
    });

    if (existing) {
      await prisma.assignment.update({
        where: { id: existing.id },
        data: {
          teachers: {
            connect: teacherIds.map((id) => ({ id })),
          },
        },
      });
      updated++;
    } else {
      await prisma.assignment.create({
        data: {
          groupId,
          subjectId: data.subjectId,
          teachers: {
            connect: teacherIds.map((id) => ({ id })),
          },
        },
      });
      created++;
    }
  }

  await logAction({
    userId: actor.id,
    action: "CREATE_ASSIGNMENT",
    entity: "assignment",
    entityId: `${data.subjectId}`,
    meta: {
      teacherIds,
      subjectId: data.subjectId,
      groupIds,
      created,
      updated,
    },
  });
  return { created, updated };
}

export async function deleteAssignment(id: string) {
  const actor = await checkAdmin();
  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: {
      teachers: { select: { name: true, username: true } },
      group: { select: { name: true } },
      subject: { select: { name: true } },
    },
  });
  await prisma.assignment.delete({ where: { id } });
  await logAction({
    userId: actor.id,
    action: "DELETE_ASSIGNMENT",
    entity: "assignment",
    entityId: id,
    meta: {
      teachers: assignment?.teachers?.map((t) => t.name).join(", "),
      group: assignment?.group?.name,
      subject: assignment?.subject?.name,
    },
  });
}

export async function updateAssignment(data: {
  subjectId: string;
  teacherIds: string[];
  groupIds: string[];
  prevAssignmentIds: string[];
}) {
  const actor = await checkAdmin();
  const teacherIds = [...new Set(data.teacherIds)].filter(Boolean);
  const groupIds = [...new Set(data.groupIds)].filter(Boolean);
  if (teacherIds.length === 0 || !data.subjectId || groupIds.length === 0) {
    throw new Error(translate("errors.pickTeacherAndGroup"));
  }

  // The assignments this row currently covers — teachers plus subject.
  const prev = await prisma.assignment.findMany({
    where: { id: { in: data.prevAssignmentIds } },
    select: { id: true, groupId: true },
  });

  let created = 0;
  let updated = 0;

  // Bring each selected group to exactly this set of teachers.
  for (const groupId of groupIds) {
    const existing = await prisma.assignment.findUnique({
      where: { groupId_subjectId: { groupId, subjectId: data.subjectId } },
      select: { id: true },
    });
    if (existing) {
      await prisma.assignment.update({
        where: { id: existing.id },
        data: { teachers: { set: teacherIds.map((id) => ({ id })) } },
      });
      updated++;
    } else {
      await prisma.assignment.create({
        data: {
          groupId,
          subjectId: data.subjectId,
          teachers: { connect: teacherIds.map((id) => ({ id })) },
        },
      });
      created++;
    }
  }

  // Drop this row's assignments for the groups that were unselected.
  const removed = prev.filter((a) => !groupIds.includes(a.groupId));
  if (removed.length) {
    await prisma.assignment.deleteMany({
      where: { id: { in: removed.map((a) => a.id) } },
    });
  }

  await logAction({
    userId: actor.id,
    action: "UPDATE_ASSIGNMENT",
    entity: "assignment",
    entityId: data.subjectId,
    meta: {
      subjectId: data.subjectId,
      teacherIds,
      groupIds,
      created,
      updated,
      removed: removed.length,
    },
  });
  return { created, updated, removed: removed.length };
}

export async function deleteAssignments(ids: string[]) {
  const actor = await checkAdmin();
  const clean = [...new Set(ids)].filter(Boolean);
  if (clean.length === 0) return;

  const items = await prisma.assignment.findMany({
    where: { id: { in: clean } },
    include: {
      teachers: { select: { name: true } },
      group: { select: { name: true } },
      subject: { select: { name: true } },
    },
  });

  await prisma.assignment.deleteMany({ where: { id: { in: clean } } });

  await logAction({
    userId: actor.id,
    action: "DELETE_ASSIGNMENT",
    entity: "assignment",
    entityId: clean.join(","),
    meta: {
      count: items.length,
      subject: items[0]?.subject?.name,
      teachers: items[0]?.teachers?.map((t) => t.name).join(", "),
      groups: items.map((i) => i.group.name).join(", "),
    },
  });
}

// Bell times
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const BELL_DAY_GROUPS = ["main", "thu", "sat"];

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// Validates and sorts a set of periods (number, start, end).
function cleanSlots(
  rows: { number: number; startTime: string; endTime: string }[],
): { number: number; startTime: string; endTime: string }[] {
  const seen = new Set<number>();
  const clean = rows
    .map((r) => ({
      number: Math.trunc(Number(r.number)),
      startTime: r.startTime.trim(),
      endTime: r.endTime.trim(),
    }))
    .filter((r) => r.startTime || r.endTime);

  for (const r of clean) {
    if (!Number.isFinite(r.number) || r.number < 1 || r.number > 50)
      throw new Error(translate("ui.thePeriodNumberMustBeBetween1And"));
    if (seen.has(r.number)) throw new Error(translate("ui.periodTwice", { number: r.number }));
    seen.add(r.number);
    if (!TIME_RE.test(r.startTime) || !TIME_RE.test(r.endTime))
      throw new Error(translate("ui.periodBadTime", { number: r.number }));
    if (timeToMinutes(r.startTime) >= timeToMinutes(r.endTime))
      throw new Error(translate("ui.periodStartAfterEnd", { number: r.number }));
  }
  return clean.sort((a, b) => a.number - b.number);
}

// The standard timetable: saves every day group at once.
export async function saveBellTimes(
  rows: {
    dayGroup: string;
    number: number;
    startTime: string;
    endTime: string;
  }[],
) {
  const actor = await checkAdmin();

  const byGroup = new Map<
    string,
    { number: number; startTime: string; endTime: string }[]
  >();
  for (const r of rows) {
    if (!BELL_DAY_GROUPS.includes(r.dayGroup))
      throw new Error(translate("ui.unknownDayGroup", { group: r.dayGroup }));
    const arr = byGroup.get(r.dayGroup) ?? [];
    arr.push({ number: r.number, startTime: r.startTime, endTime: r.endTime });
    byGroup.set(r.dayGroup, arr);
  }

  const data: {
    dayGroup: string;
    number: number;
    startTime: string;
    endTime: string;
  }[] = [];
  for (const [dayGroup, slots] of byGroup) {
    for (const s of cleanSlots(slots)) data.push({ dayGroup, ...s });
  }

  await prisma.$transaction([
    prisma.bellTime.deleteMany({}),
    prisma.bellTime.createMany({ data }),
  ]);

  await logAction({
    userId: actor.id,
    action: "SAVE_BELL_TIMES",
    entity: "bell_time",
    meta: { count: data.length },
  });
}

function validateOverride(data: {
  name?: string;
  startDate: string;
  endDate: string;
  slots: { number: number; startTime: string; endTime: string }[];
}) {
  const startDate = data.startDate.trim();
  const endDate = data.endDate.trim();
  if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate))
    throw new Error(translate("errors.periodDatesRequired"));
  if (startDate > endDate)
    throw new Error(translate("errors.startAfterEnd"));
  const slots = cleanSlots(data.slots);
  if (slots.length === 0) throw new Error(translate("errors.addAtLeastOneSlot"));
  return { name: data.name?.trim() || null, startDate, endDate, slots };
}

export async function createBellOverride(data: {
  name?: string;
  startDate: string;
  endDate: string;
  slots: { number: number; startTime: string; endTime: string }[];
}) {
  const actor = await checkAdmin();
  const v = validateOverride(data);
  const created = await prisma.bellOverride.create({
    data: {
      name: v.name,
      startDate: new Date(v.startDate),
      endDate: new Date(v.endDate),
      slots: { create: v.slots },
    },
  });
  await logAction({
    userId: actor.id,
    action: "CREATE_BELL_OVERRIDE",
    entity: "bell_override",
    entityId: created.id,
    meta: { name: v.name, startDate: v.startDate, endDate: v.endDate },
  });
}

export async function updateBellOverride(
  id: string,
  data: {
    name?: string;
    startDate: string;
    endDate: string;
    slots: { number: number; startTime: string; endTime: string }[];
  },
) {
  const actor = await checkAdmin();
  const v = validateOverride(data);
  await prisma.$transaction([
    prisma.bellOverrideSlot.deleteMany({ where: { overrideId: id } }),
    prisma.bellOverride.update({
      where: { id },
      data: {
        name: v.name,
        startDate: new Date(v.startDate),
        endDate: new Date(v.endDate),
        slots: { create: v.slots },
      },
    }),
  ]);
  await logAction({
    userId: actor.id,
    action: "UPDATE_BELL_OVERRIDE",
    entity: "bell_override",
    entityId: id,
    meta: { name: v.name, startDate: v.startDate, endDate: v.endDate },
  });
}

export async function deleteBellOverride(id: string) {
  const actor = await checkAdmin();
  await prisma.bellOverride.delete({ where: { id } });
  await logAction({
    userId: actor.id,
    action: "DELETE_BELL_OVERRIDE",
    entity: "bell_override",
    entityId: id,
  });
}

export async function getUserDetailsForAdmin(userId: string) {
  const actor = await checkAdmin();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      group: true,
      specialties: { select: { id: true, name: true, abbreviation: true }, orderBy: { name: "asc" } },
      subjects: { select: { id: true, name: true }, orderBy: { name: "asc" } },
      curatedGroups: { select: { id: true, name: true }, orderBy: { name: "asc" } },
    },
  });

  if (!user) throw new Error(translate("errors.userNotFound"));

  // If it's a student, get their academic info (grades by semester)
  type SemesterRow = {
    subjectId: string;
    subject: string;
    grades: { id: string; value: string; date: Date; topic: string | null; type: string }[];
    avg: string | null;
  };

  let academic: {
    semesters: { id: string; name: string; year: string }[];
    semesterData: Record<string, SemesterRow[]>;
  } | null = null;

  if (user.role === Role.STUDENT && user.groupId) {
    const semesters = await prisma.semester.findMany({
      orderBy: [{ year: "desc" }, { number: "desc" }],
    });

    const assignments = await prisma.assignment.findMany({
      where: { groupId: user.groupId },
      include: {
        subject: true,
        lessons: {
          orderBy: { date: "asc" },
          include: {
            grades: { where: { studentId: user.id } },
            semester: { select: { id: true } },
          },
        },
      },
      orderBy: { subject: { name: "asc" } },
    });

    const semesterData: Record<string, SemesterRow[]> = {};

    for (const semester of semesters) {
      const rows = assignments
        .map((a) => {
          const lessons = a.lessons.filter((l) => l.semester.id === semester.id);
          const grades = lessons
            .map((l) => {
              const val = l.grades[0]?.value;
              if (!val) return null;
              return {
                id: l.id,
                value: val,
                date: l.date,
                topic: l.topic,
                type: l.type,
              };
            })
            // A type predicate, so the nulls are gone from the type as well
            // as the array and the grades below need no casting.
            .filter((g): g is NonNullable<typeof g> => g !== null);

          const numeric = grades.filter((g) => g.value !== ABSENT).map((g) => Number(g.value));
          const avg = numeric.length
            ? (numeric.reduce((sum, val) => sum + val, 0) / numeric.length).toFixed(1)
            : null;

          return {
            subjectId: a.subject.id,
            subject: a.subject.name,
            grades,
            avg,
          };
        })
        .filter((r) => r.grades.length > 0);

      if (rows.length > 0) {
        semesterData[semester.id] = rows;
      }
    }

    academic = {
      semesters: semesters.filter((s) => semesterData[s.id]),
      semesterData,
    };
  }

  return {
    user,
    academic,
  };
}
