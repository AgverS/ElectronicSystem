/**
 * Row types for the demo database.
 *
 * Scalars mirror the original schema exactly. Relations are declared as always
 * present rather than optional: whether a relation is populated depends on the
 * `include` passed at the call site, and reproducing Prisma's conditional
 * generics would add a great deal of machinery for a demo build. Declaring them
 * present keeps editor support and stops every `.map()` over an included
 * relation from being an implicit `any`. Read a relation you did not include
 * and you get `undefined` at runtime — same as forgetting an `include` against
 * a real database.
 */

import type { Role, RecordKind } from "@/lib/prisma-client";

interface Countable {
  /** Populated when the query asked for `_count`. */
  _count: Record<string, number>;
}

export interface User extends Countable {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  email: string | null;
  username: string | null;
  role: Role;
  isMaster: boolean;
  groupId: string | null;
  calendarToken: string | null;
  reportBlocked: boolean;

  group: Group | null;
  curatedGroups: Group[];
  grades: Grade[];
  scheduleEntries: ScheduleEntry[];
  substitutions: ScheduleSubstitution[];
  records: StudentRecord[];
  issuedRecords: StudentRecord[];
  excusedAbsences: ExcusedAbsence[];
  extraLessons: ExtraLesson[];
  extraLessonRsvps: ExtraLessonRsvp[];
  auditLogs: AuditLog[];
  assignments: Assignment[];
  specialties: Specialty[];
  subjects: Subject[];
}

export interface Group extends Countable {
  id: string;
  name: string;
  year: number;
  createdAt: Date;
  updatedAt: Date;
  curatorId: string | null;
  specialtyId: string | null;

  curator: User | null;
  specialty: Specialty | null;
  students: User[];
  assignments: Assignment[];
  scheduleEntries: ScheduleEntry[];
  substitutions: ScheduleSubstitution[];
  extraLessons: ExtraLesson[];
}

export interface Subject extends Countable {
  id: string;
  name: string;
  isPractical: boolean;
  hours: number | null;
  hoursSemesterId: string | null;
  createdAt: Date;

  assignments: Assignment[];
  scheduleEntries: ScheduleEntry[];
  substitutions: ScheduleSubstitution[];
  specialties: Specialty[];
  teachers: User[];
}

export interface Specialty extends Countable {
  id: string;
  name: string;
  abbreviation: string;
  letter: string;
  createdAt: Date;

  groups: Group[];
  subjects: Subject[];
  users: User[];
}

export interface Semester extends Countable {
  id: string;
  name: string;
  number: number;
  year: string;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
  createdAt: Date;

  lessons: Lesson[];
}

export interface Assignment extends Countable {
  id: string;
  createdAt: Date;
  groupId: string;
  subjectId: string;
  labsTotal: number | null;

  group: Group;
  subject: Subject;
  lessons: Lesson[];
  teachers: User[];
}

export interface Lesson extends Countable {
  id: string;
  date: Date;
  topic: string | null;
  type: string;
  deadline: Date | null;
  assignmentId: string;
  semesterId: string;
  createdAt: Date;

  assignment: Assignment;
  semester: Semester;
  grades: Grade[];
}

export interface Grade extends Countable {
  id: string;
  value: string;
  lateness: number | null;
  retakeNumber: number;
  createdAt: Date;
  updatedAt: Date;
  lessonId: string;
  studentId: string;

  lesson: Lesson;
  student: User;
}

export interface ExcusedAbsence extends Countable {
  id: string;
  studentId: string;
  date: Date;
  createdAt: Date;

  student: User;
}

export interface ScheduleEntry extends Countable {
  id: string;
  groupId: string;
  dayOfWeek: number;
  lessonNumber: number;
  subgroup: string;
  subjectId: string;
  teacherId: string;
  room: string;
  createdAt: Date;
  updatedAt: Date;

  group: Group;
  subject: Subject;
  teacher: User;
}

export interface ScheduleSubstitution extends Countable {
  id: string;
  groupId: string;
  date: Date;
  lessonNumber: number;
  subgroup: string;
  cancelled: boolean;
  subjectId: string | null;
  teacherId: string | null;
  room: string | null;
  createdAt: Date;
  updatedAt: Date;

  group: Group;
  subject: Subject | null;
  teacher: User | null;
}

export interface AuditLog extends Countable {
  id: string;
  createdAt: Date;
  userId: string;
  action: string;
  entity: string;
  entityId: string | null;
  meta: unknown;
  ipAddress: string | null;
  userAgent: string | null;

  user: User;
}

export interface StudentRecord extends Countable {
  id: string;
  kind: RecordKind;
  number: string;
  date: Date;
  reason: string;
  writtenOffAt: Date | null;
  writtenOffById: string | null;
  studentId: string;
  issuedById: string;
  createdAt: Date;
  updatedAt: Date;

  student: User;
  issuedBy: User;
  attachments: RecordAttachment[];
}

export interface RecordAttachment extends Countable {
  id: string;
  recordId: string;
  fileName: string;
  mimeType: string;
  size: number;
  storageKey: string;
  createdAt: Date;

  record: StudentRecord;
}

export interface BackupSetting extends Countable {
  id: string;
  enabled: boolean;
  intervalHours: number;
  keepCount: number;
  lastBackupAt: Date | null;
  updatedAt: Date;
}

export interface BellTime extends Countable {
  id: string;
  dayGroup: string;
  number: number;
  startTime: string;
  endTime: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BellOverride extends Countable {
  id: string;
  name: string | null;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;

  slots: BellOverrideSlot[];
}

export interface BellOverrideSlot extends Countable {
  id: string;
  overrideId: string;
  number: number;
  startTime: string;
  endTime: string;

  override: BellOverride;
}

export interface ExtraLesson extends Countable {
  id: string;
  teacherId: string;
  date: Date;
  lessonNumber: number;
  room: string;
  comment: string | null;
  groupId: string | null;
  createdAt: Date;

  teacher: User;
  group: Group | null;
  rsvps: ExtraLessonRsvp[];
}

export interface ExtraLessonRsvp extends Countable {
  id: string;
  extraLessonId: string;
  studentId: string;
  createdAt: Date;

  extraLesson: ExtraLesson;
  student: User;
}

/** Maps a model name to its row type, so the client can be typed generically. */
export interface ModelTypes {
  user: User;
  group: Group;
  subject: Subject;
  specialty: Specialty;
  semester: Semester;
  assignment: Assignment;
  lesson: Lesson;
  grade: Grade;
  excusedAbsence: ExcusedAbsence;
  scheduleEntry: ScheduleEntry;
  scheduleSubstitution: ScheduleSubstitution;
  auditLog: AuditLog;
  studentRecord: StudentRecord;
  recordAttachment: RecordAttachment;
  backupSetting: BackupSetting;
  bellTime: BellTime;
  bellOverride: BellOverride;
  bellOverrideSlot: BellOverrideSlot;
  extraLesson: ExtraLesson;
  extraLessonRsvp: ExtraLessonRsvp;
}
