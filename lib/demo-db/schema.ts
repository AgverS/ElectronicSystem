/**
 * Model metadata for the demo database.
 *
 * Mirrors the shape of the original Prisma schema closely enough that query
 * code written against Prisma keeps working unchanged. The engine reads this
 * to resolve relations, apply defaults, coerce types and cascade deletes.
 */

export type ScalarType = "string" | "int" | "bool" | "date" | "json";

/**
 * Declared explicitly rather than inferred from SCHEMA: relations refer to model
 * names, so inferring the names from the definitions that use them would be
 * circular.
 */
export type ModelName =
  | "user"
  | "group"
  | "subject"
  | "specialty"
  | "semester"
  | "assignment"
  | "lesson"
  | "grade"
  | "excusedAbsence"
  | "scheduleEntry"
  | "scheduleSubstitution"
  | "auditLog"
  | "studentRecord"
  | "recordAttachment"
  | "backupSetting"
  | "bellTime"
  | "bellOverride"
  | "bellOverrideSlot"
  | "extraLesson"
  | "extraLessonRsvp";

export interface FieldDef {
  type: ScalarType;
  optional?: boolean;
  /** Generate a value when the caller omits the field. */
  default?: "cuid" | "now" | (() => unknown) | string | number | boolean;
  /** Stamped with the current time on every write. */
  updatedAt?: boolean;
}

export type RelationDef =
  | {
      kind: "one";
      model: ModelName;
      /** Local scalar field holding the target id. */
      fk: string;
      optional?: boolean;
    }
  | {
      kind: "many";
      model: ModelName;
      /** Field on the target model pointing back at this one. */
      backFk: string;
      /** Rows to remove when the parent is deleted. */
      onDelete?: "cascade" | "setNull";
    }
  | {
      kind: "manyToMany";
      model: ModelName;
      join: JoinName;
      /** Join-table column holding this model's id. */
      self: string;
      /** Join-table column holding the target model's id. */
      other: string;
    };

export interface ModelDef {
  fields: Record<string, FieldDef>;
  relations: Record<string, RelationDef>;
}

export const JOIN_TABLES = [
  "userAssignments",
  "userSpecialties",
  "subjectSpecialties",
  "teacherSubjects",
] as const;
export type JoinName = (typeof JOIN_TABLES)[number];

const id: FieldDef = { type: "string", default: "cuid" };
const createdAt: FieldDef = { type: "date", default: "now" };
const updatedAt: FieldDef = { type: "date", default: "now", updatedAt: true };
const str = (optional = false): FieldDef => ({ type: "string", optional });
const int = (def?: number): FieldDef => ({ type: "int", default: def, optional: def === undefined });
const bool = (def = false): FieldDef => ({ type: "bool", default: def });
const date = (optional = false): FieldDef => ({ type: "date", optional });

export const SCHEMA: Record<ModelName, ModelDef> = {
  user: {
    fields: {
      id,
      createdAt,
      updatedAt,
      name: str(),
      email: str(true),
      username: str(true),
      role: { type: "string", default: "STUDENT" },
      isMaster: bool(false),
      groupId: str(true),
      calendarToken: str(true),
      reportBlocked: bool(false),
    },
    relations: {
      group: { kind: "one", model: "group", fk: "groupId", optional: true },
      curatedGroups: { kind: "many", model: "group", backFk: "curatorId", onDelete: "setNull" },
      grades: { kind: "many", model: "grade", backFk: "studentId", onDelete: "cascade" },
      scheduleEntries: { kind: "many", model: "scheduleEntry", backFk: "teacherId", onDelete: "cascade" },
      substitutions: { kind: "many", model: "scheduleSubstitution", backFk: "teacherId", onDelete: "setNull" },
      records: { kind: "many", model: "studentRecord", backFk: "studentId", onDelete: "cascade" },
      issuedRecords: { kind: "many", model: "studentRecord", backFk: "issuedById", onDelete: "cascade" },
      excusedAbsences: { kind: "many", model: "excusedAbsence", backFk: "studentId", onDelete: "cascade" },
      extraLessons: { kind: "many", model: "extraLesson", backFk: "teacherId", onDelete: "cascade" },
      extraLessonRsvps: { kind: "many", model: "extraLessonRsvp", backFk: "studentId", onDelete: "cascade" },
      auditLogs: { kind: "many", model: "auditLog", backFk: "userId", onDelete: "cascade" },
      assignments: {
        kind: "manyToMany",
        model: "assignment",
        join: "userAssignments",
        self: "userId",
        other: "assignmentId",
      },
      specialties: {
        kind: "manyToMany",
        model: "specialty",
        join: "userSpecialties",
        self: "userId",
        other: "specialtyId",
      },
      subjects: {
        kind: "manyToMany",
        model: "subject",
        join: "teacherSubjects",
        self: "userId",
        other: "subjectId",
      },
    },
  },

  group: {
    fields: {
      id,
      name: str(),
      year: int(1),
      createdAt,
      updatedAt,
      curatorId: str(true),
      specialtyId: str(true),
    },
    relations: {
      curator: { kind: "one", model: "user", fk: "curatorId", optional: true },
      specialty: { kind: "one", model: "specialty", fk: "specialtyId", optional: true },
      students: { kind: "many", model: "user", backFk: "groupId", onDelete: "setNull" },
      assignments: { kind: "many", model: "assignment", backFk: "groupId", onDelete: "cascade" },
      scheduleEntries: { kind: "many", model: "scheduleEntry", backFk: "groupId", onDelete: "cascade" },
      substitutions: { kind: "many", model: "scheduleSubstitution", backFk: "groupId", onDelete: "cascade" },
      extraLessons: { kind: "many", model: "extraLesson", backFk: "groupId", onDelete: "setNull" },
    },
  },

  subject: {
    fields: {
      id,
      name: str(),
      isPractical: bool(false),
      hours: int(),
      hoursSemesterId: str(true),
      createdAt,
    },
    relations: {
      assignments: { kind: "many", model: "assignment", backFk: "subjectId", onDelete: "cascade" },
      scheduleEntries: { kind: "many", model: "scheduleEntry", backFk: "subjectId", onDelete: "cascade" },
      substitutions: { kind: "many", model: "scheduleSubstitution", backFk: "subjectId", onDelete: "setNull" },
      specialties: {
        kind: "manyToMany",
        model: "specialty",
        join: "subjectSpecialties",
        self: "subjectId",
        other: "specialtyId",
      },
      teachers: {
        kind: "manyToMany",
        model: "user",
        join: "teacherSubjects",
        self: "subjectId",
        other: "userId",
      },
    },
  },

  specialty: {
    fields: {
      id,
      name: str(),
      abbreviation: { type: "string", default: "" },
      letter: { type: "string", default: "" },
      createdAt,
    },
    relations: {
      groups: { kind: "many", model: "group", backFk: "specialtyId", onDelete: "setNull" },
      subjects: {
        kind: "manyToMany",
        model: "subject",
        join: "subjectSpecialties",
        self: "specialtyId",
        other: "subjectId",
      },
      users: {
        kind: "manyToMany",
        model: "user",
        join: "userSpecialties",
        self: "specialtyId",
        other: "userId",
      },
    },
  },

  semester: {
    fields: {
      id,
      name: str(),
      number: int(1),
      year: str(),
      startDate: date(),
      endDate: date(),
      isCurrent: bool(false),
      createdAt,
    },
    relations: {
      lessons: { kind: "many", model: "lesson", backFk: "semesterId", onDelete: "cascade" },
    },
  },

  assignment: {
    fields: {
      id,
      createdAt,
      groupId: str(),
      subjectId: str(),
      labsTotal: int(),
    },
    relations: {
      group: { kind: "one", model: "group", fk: "groupId" },
      subject: { kind: "one", model: "subject", fk: "subjectId" },
      lessons: { kind: "many", model: "lesson", backFk: "assignmentId", onDelete: "cascade" },
      teachers: {
        kind: "manyToMany",
        model: "user",
        join: "userAssignments",
        self: "assignmentId",
        other: "userId",
      },
    },
  },

  lesson: {
    fields: {
      id,
      date: date(),
      topic: str(true),
      type: { type: "string", default: "lecture" },
      deadline: date(true),
      assignmentId: str(),
      semesterId: str(),
      createdAt,
    },
    relations: {
      assignment: { kind: "one", model: "assignment", fk: "assignmentId" },
      semester: { kind: "one", model: "semester", fk: "semesterId" },
      grades: { kind: "many", model: "grade", backFk: "lessonId", onDelete: "cascade" },
    },
  },

  grade: {
    fields: {
      id,
      value: str(),
      lateness: int(),
      retakeNumber: int(0),
      createdAt,
      updatedAt,
      lessonId: str(),
      studentId: str(),
    },
    relations: {
      lesson: { kind: "one", model: "lesson", fk: "lessonId" },
      student: { kind: "one", model: "user", fk: "studentId" },
    },
  },

  excusedAbsence: {
    fields: { id, studentId: str(), date: date(), createdAt },
    relations: {
      student: { kind: "one", model: "user", fk: "studentId" },
    },
  },

  scheduleEntry: {
    fields: {
      id,
      groupId: str(),
      dayOfWeek: int(1),
      lessonNumber: int(1),
      subgroup: { type: "string", default: "" },
      subjectId: str(),
      teacherId: str(),
      room: str(),
      createdAt,
      updatedAt,
    },
    relations: {
      group: { kind: "one", model: "group", fk: "groupId" },
      subject: { kind: "one", model: "subject", fk: "subjectId" },
      teacher: { kind: "one", model: "user", fk: "teacherId" },
    },
  },

  scheduleSubstitution: {
    fields: {
      id,
      groupId: str(),
      date: date(),
      lessonNumber: int(1),
      subgroup: { type: "string", default: "" },
      cancelled: bool(false),
      subjectId: str(true),
      teacherId: str(true),
      room: str(true),
      createdAt,
      updatedAt,
    },
    relations: {
      group: { kind: "one", model: "group", fk: "groupId" },
      subject: { kind: "one", model: "subject", fk: "subjectId", optional: true },
      teacher: { kind: "one", model: "user", fk: "teacherId", optional: true },
    },
  },

  auditLog: {
    fields: {
      id,
      createdAt,
      userId: str(),
      action: str(),
      entity: str(),
      entityId: str(true),
      meta: { type: "json", optional: true },
      ipAddress: str(true),
      userAgent: str(true),
    },
    relations: {
      user: { kind: "one", model: "user", fk: "userId" },
    },
  },

  studentRecord: {
    fields: {
      id,
      kind: { type: "string", default: "REWARD" },
      number: str(),
      date: date(),
      reason: str(),
      writtenOffAt: date(true),
      writtenOffById: str(true),
      studentId: str(),
      issuedById: str(),
      createdAt,
      updatedAt,
    },
    relations: {
      student: { kind: "one", model: "user", fk: "studentId" },
      issuedBy: { kind: "one", model: "user", fk: "issuedById" },
      attachments: { kind: "many", model: "recordAttachment", backFk: "recordId", onDelete: "cascade" },
    },
  },

  recordAttachment: {
    fields: {
      id,
      recordId: str(),
      fileName: str(),
      mimeType: str(),
      size: int(0),
      storageKey: str(),
      createdAt,
    },
    relations: {
      record: { kind: "one", model: "studentRecord", fk: "recordId" },
    },
  },

  backupSetting: {
    fields: {
      id: { type: "string", default: "singleton" },
      enabled: bool(false),
      intervalHours: int(24),
      keepCount: int(10),
      lastBackupAt: date(true),
      updatedAt,
    },
    relations: {},
  },

  bellTime: {
    fields: {
      id,
      dayGroup: str(),
      number: int(1),
      startTime: str(),
      endTime: str(),
      createdAt,
      updatedAt,
    },
    relations: {},
  },

  bellOverride: {
    fields: {
      id,
      name: str(true),
      startDate: date(),
      endDate: date(),
      createdAt,
      updatedAt,
    },
    relations: {
      slots: { kind: "many", model: "bellOverrideSlot", backFk: "overrideId", onDelete: "cascade" },
    },
  },

  bellOverrideSlot: {
    fields: {
      id,
      overrideId: str(),
      number: int(1),
      startTime: str(),
      endTime: str(),
    },
    relations: {
      override: { kind: "one", model: "bellOverride", fk: "overrideId" },
    },
  },

  extraLesson: {
    fields: {
      id,
      teacherId: str(),
      date: date(),
      lessonNumber: int(1),
      room: str(),
      comment: str(true),
      groupId: str(true),
      createdAt,
    },
    relations: {
      teacher: { kind: "one", model: "user", fk: "teacherId" },
      group: { kind: "one", model: "group", fk: "groupId", optional: true },
      rsvps: { kind: "many", model: "extraLessonRsvp", backFk: "extraLessonId", onDelete: "cascade" },
    },
  },

  extraLessonRsvp: {
    fields: { id, extraLessonId: str(), studentId: str(), createdAt },
    relations: {
      extraLesson: { kind: "one", model: "extraLesson", fk: "extraLessonId" },
      student: { kind: "one", model: "user", fk: "studentId" },
    },
  },
};

export const MODEL_NAMES = Object.keys(SCHEMA) as ModelName[];

export function modelDef(model: ModelName): ModelDef {
  return SCHEMA[model];
}
