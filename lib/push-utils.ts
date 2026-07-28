export type PushFilter =
  | { groupId: string }
  | { teacherId: string }
  | { room: string };

export function filterKey(f: PushFilter): string {
  if ("groupId" in f) return `group:${f.groupId}`;
  if ("teacherId" in f) return `teacher:${f.teacherId}`;
  return `room:${f.room}`;
}
