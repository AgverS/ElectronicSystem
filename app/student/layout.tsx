import { redirect } from "next/navigation";
import { requireRole } from "@/lib/session";
import { Role } from "@/lib/prisma-client";
import { AppShell } from "@/components/layout/app-shell";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(Role.STUDENT, Role.ADMIN);
  if (!user) redirect("/login");

  return (
    <AppShell
      section="student"
      title="Ученик"
      userName={user.username ?? user.name}
    >
      {children}
    </AppShell>
  );
}
