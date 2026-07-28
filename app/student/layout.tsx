"use client";

import { RoleGate } from "@/components/layout/role-gate";
import { Role } from "@/lib/prisma-client";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate allow={[Role.STUDENT, Role.ADMIN]} section="student" titleKey="role.student.section">
      {() => children}
    </RoleGate>
  );
}
