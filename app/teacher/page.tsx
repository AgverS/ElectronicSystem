import { requireRole } from "@/lib/session";
import { Role } from "@/lib/prisma-client";
import { redirect } from "next/navigation";
import { TeacherJournalsView } from "@/components/teacher/teacher-journals-view";

export default async function TeacherPage() {
  const user = await requireRole(Role.TEACHER, Role.ADMIN);
  if (!user) redirect("/login");

  return <TeacherJournalsView userRole={user.role} />;
}
