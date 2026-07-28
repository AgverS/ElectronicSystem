/**
 * Lesson kinds are stored as stable codes and translated at render time, so the
 * data stays language-neutral while the interface follows the chosen language.
 */

export const LESSON_TYPES = ["lecture", "practical", "lab", "assessment"] as const;

export type LessonType = (typeof LESSON_TYPES)[number];

export const DEFAULT_LESSON_TYPE: LessonType = "lecture";

export function lessonTypeKey(type: string): string {
  return `lessonType.${LESSON_TYPES.includes(type as LessonType) ? type : DEFAULT_LESSON_TYPE}`;
}

export function lessonTypeShortKey(type: string): string {
  return `${lessonTypeKey(type)}.short`;
}

/** Laboratory work is the only kind with a submission deadline. */
export function hasDeadline(type: string): boolean {
  return type === "lab";
}
