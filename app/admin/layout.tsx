"use client";

import { RoleGate } from "@/components/layout/role-gate";
import { Role } from "@/lib/prisma-client";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate allow={[Role.ADMIN]} section="admin" titleKey="role.admin.section">
      {() => children}
    </RoleGate>
  );
}
