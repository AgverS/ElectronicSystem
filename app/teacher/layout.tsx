import { redirect } from "next/navigation";
import { requireRole } from "@/lib/session";
import { Role } from "@/lib/prisma-client";
import { AppShell } from "@/components/layout/app-shell";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(Role.TEACHER, Role.ADMIN);
  if (!user) redirect("/login");

  const section = user.role === Role.ADMIN ? "teacher-admin" : "teacher";

  return (
    <AppShell
      section={section}
      title="Преподаватель"
      userName={user.username ?? user.name}
    >
      {children}
    </AppShell>
  );
}
