"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UsersTable, type UsersTableProps } from "@/components/admin/users-table";
import { Role } from "@/lib/prisma-client";

type Props = Omit<UsersTableProps, "lockedRoles">; // specialties is already included via UsersTableProps

function UsersTabsInner(props: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "students";

  function handleTabChange(value: string) {
    router.push(`/admin/users?tab=${value}`);
  }

  return (
    <Tabs value={tab} onValueChange={handleTabChange}>
      <TabsList className="mb-4">
        <TabsTrigger value="students">Учащиеся</TabsTrigger>
        <TabsTrigger value="staff">Сотрудники</TabsTrigger>
      </TabsList>
      <TabsContent value="students">
        <UsersTable {...props} lockedRoles={[Role.STUDENT]} />
      </TabsContent>
      <TabsContent value="staff">
        <UsersTable {...props} lockedRoles={[Role.ADMIN, Role.TEACHER]} />
      </TabsContent>
    </Tabs>
  );
}

export function UsersTabs(props: Props) {
  return (
    <Suspense>
      <UsersTabsInner {...props} />
    </Suspense>
  );
}
