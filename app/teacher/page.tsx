"use client";

import { TeacherJournalsView } from "@/components/teacher/teacher-journals-view";
import { PageLoading } from "@/components/ui/page-state";
import { useDemoUser } from "@/lib/demo-session";

export default function TeacherPage() {
  const user = useDemoUser();
  if (!user) return <PageLoading />;
  return <TeacherJournalsView userRole={user.role} />;
}
