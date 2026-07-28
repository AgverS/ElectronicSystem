"use client";

/**
 * Demo sign-in replacement.
 *
 * There is no registration and no password in this build. Instead the visitor
 * picks a persona — an administrator, a teacher or a student — and the whole
 * app behaves as that person. Switching is instant and reversible, which is the
 * point: the demo exists to show what each role sees.
 */

import * as React from "react";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/prisma-client";

export interface Persona {
  id: string;
  name: string;
  role: Role;
  username: string | null;
  groupId: string | null;
  /** Short line describing this persona in the switcher. */
  context: string;
}

export interface DemoUser extends Persona {
  isMaster: boolean;
  email: string | null;
  calendarToken: string | null;
  reportBlocked: boolean;
}

const STORAGE_KEY = "electronic-system-demo-persona";

interface SessionValue {
  user: DemoUser | null;
  personas: Persona[];
  setPersona: (id: string) => void;
  /** False until personas have loaded from the demo database. */
  ready: boolean;
}

const SessionContext = React.createContext<SessionValue>({
  user: null,
  personas: [],
  setPersona: () => {},
  ready: false,
});

/** Choose the personas that best show off each role's screens. */
async function loadPersonas(): Promise<Persona[]> {
  const [admin, teachers, students] = await Promise.all([
    prisma.user.findFirst({ where: { role: Role.ADMIN } }),
    prisma.user.findMany({
      where: { role: Role.TEACHER },
      include: { curatedGroups: true, subjects: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { role: Role.STUDENT },
      include: { group: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const personas: Persona[] = [];

  if (admin) {
    personas.push({
      id: admin.id,
      name: admin.name,
      role: Role.ADMIN,
      username: admin.username,
      groupId: null,
      context: "Registrar's office",
    });
  }

  // Prefer teachers who curate a group — their screens have the most to show.
  const rankedTeachers = [...teachers].sort(
    (a: any, b: any) => b.curatedGroups.length - a.curatedGroups.length,
  );
  for (const teacher of rankedTeachers.slice(0, 3) as any[]) {
    const curated = teacher.curatedGroups[0]?.name;
    personas.push({
      id: teacher.id,
      name: teacher.name,
      role: Role.TEACHER,
      username: teacher.username,
      groupId: null,
      context: curated
        ? `Teaches ${teacher.subjects[0]?.name ?? "—"} · curator of ${curated}`
        : `Teaches ${teacher.subjects[0]?.name ?? "—"}`,
    });
  }

  // One student per group, so the switcher covers several specialties.
  const seenGroups = new Set<string>();
  for (const student of students as any[]) {
    if (!student.group || seenGroups.has(student.group.id)) continue;
    seenGroups.add(student.group.id);
    personas.push({
      id: student.id,
      name: student.name,
      role: Role.STUDENT,
      username: student.username,
      groupId: student.groupId,
      context: `Group ${student.group.name}`,
    });
    if (seenGroups.size >= 3) break;
  }

  return personas;
}

export function DemoSessionProvider({ children }: { children: React.ReactNode }) {
  const [personas, setPersonas] = React.useState<Persona[]>([]);
  const [user, setUser] = React.useState<DemoUser | null>(null);
  const [ready, setReady] = React.useState(false);

  const activate = React.useCallback(async (id: string | null) => {
    if (!id) {
      setUser(null);
      return;
    }
    const record: any = await prisma.user.findUnique({
      where: { id },
      include: { group: true },
    });
    if (!record) {
      setUser(null);
      return;
    }
    setUser({
      id: record.id,
      name: record.name,
      role: record.role,
      username: record.username,
      groupId: record.groupId,
      isMaster: false,
      email: record.email,
      calendarToken: record.calendarToken,
      reportBlocked: record.reportBlocked,
      context: record.group ? `Group ${record.group.name}` : "",
    });
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      const list = await loadPersonas();
      if (cancelled) return;
      setPersonas(list);

      const saved = window.localStorage.getItem(STORAGE_KEY);
      const chosen = list.find((p) => p.id === saved)?.id ?? null;
      await activate(chosen);
      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [activate]);

  const setPersona = React.useCallback(
    (id: string) => {
      window.localStorage.setItem(STORAGE_KEY, id);
      void activate(id);
    },
    [activate],
  );

  const value = React.useMemo(
    () => ({ user, personas, setPersona, ready }),
    [user, personas, setPersona, ready],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useDemoSession() {
  return React.useContext(SessionContext);
}

export function useDemoUser() {
  return React.useContext(SessionContext).user;
}

/** Clear the stored persona, sending the visitor back to the role picker. */
export function clearPersona() {
  window.localStorage.removeItem(STORAGE_KEY);
}
