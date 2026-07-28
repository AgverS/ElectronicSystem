/**
 * Stand-in for the generated Prisma client.
 *
 * The demo build has no database, but keeping this module path and its exports
 * means every file that imported enums or `Prisma` types from the generated
 * client continues to compile untouched.
 */

export const Role = {
  ADMIN: "ADMIN",
  TEACHER: "TEACHER",
  STUDENT: "STUDENT",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const RecordKind = {
  REWARD: "REWARD",
  PENALTY: "PENALTY",
} as const;
export type RecordKind = (typeof RecordKind)[keyof typeof RecordKind];

/**
 * Only the handful of members this codebase actually referenced. Query-input
 * types are intentionally permissive: the demo engine validates at runtime and
 * pinning exact generated shapes would buy nothing here.
 */
export namespace Prisma {
  export type InputJsonValue = string | number | boolean | object | null;
  export const JsonNull = null;

  export type AuditLogWhereInput = Record<string, any>;
  export type UserWhereInput = Record<string, any>;
  export type GroupWhereInput = Record<string, any>;
  export type StudentRecordWhereInput = Record<string, any>;
}
