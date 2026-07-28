"use client";

import { RoleGate } from "@/components/layout/role-gate";
import { Role } from "@/lib/prisma-client";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate
      allow={[Role.TEACHER, Role.ADMIN]}
      section={(user) => (user.role === Role.ADMIN ? "teacher-admin" : "teacher")}
      titleKey="role.teacher.section"
    >
      {() => children}
    </RoleGate>
  );
}
