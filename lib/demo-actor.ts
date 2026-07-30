/**
 * Who is performing an action, for the mutation helpers in lib/actions.
 *
 * These modules used to run on the server and read the signed-in user from the
 * session. In the demo there is no sign-in: the "actor" is whichever persona
 * the visitor has selected. The permission checks are kept exactly as they
 * were, so the demo still demonstrates that a teacher cannot do an
 * administrator's job.
 */

import { prisma } from "@/lib/prisma";
import { translate } from "@/lib/i18n/translate";
import type { Role } from "@/lib/prisma-client";
import type { User } from "@/lib/demo-db/types";
import { STORAGE_KEYS } from "@/lib/demo-db/storage";



export async function getCurrentUser(): Promise<User | null> {
  if (typeof window === "undefined") return null;
  const id = window.localStorage.getItem(STORAGE_KEYS.persona);
  if (!id) return null;
  return prisma.user.findUnique({ where: { id } });
}

export async function requireRole(...roles: Role[]): Promise<User | null> {
  const user = await getCurrentUser();
  if (!user || !roles.includes(user.role)) return null;
  return user;
}

/** Throws the standard "access denied" error rather than returning null. */
export async function requireRoleOrThrow(...roles: Role[]): Promise<User> {
  const user = await requireRole(...roles);
  if (!user) throw new Error(translate("errors.accessDenied"));
  return user;
}
