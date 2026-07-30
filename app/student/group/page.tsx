"use client";

import { useQuery } from "@tanstack/react-query";
import { translate } from "@/lib/i18n/translate";
import { IconUsersGroup, IconLoader2, IconUser } from "@tabler/icons-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GroupExportButtons } from "@/components/student/group-export-buttons";
import { formatCourse } from "@/lib/group-course";

interface Student {
  id: string;
  name: string;
}

interface GroupData {
  id: string;
  name: string;
  curator: { name: string } | null;
  students: Student[];
}

export default function StudentGroupPage() {
  const { data: group, isLoading, error } = useQuery<GroupData>({
    queryKey: ["student-group"],
    queryFn: async () => {
      const res = await fetch("/api/student/group");
      if (!res.ok) throw new Error("Failed to fetch group");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-2 text-muted-foreground">
        <IconUsersGroup size={48} className="opacity-20" />
        <p>{translate("ui.couldNotLoadTheGroup")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{translate("nav.myGroup")}</h1>
          <p className="text-muted-foreground">
            Список учащихся группы {group.name} ({formatCourse(group.name)})
          </p>
        </div>
        <GroupExportButtons
          groupName={group.name}
          curatorName={group.curator?.name ?? translate("ui.notAssigned")}
          students={group.students}
        />
      </div>

      <div className="hidden print:block text-center space-y-2 mb-8">
        <h1 className="text-2xl font-bold">Список группы {group.name} ({formatCourse(group.name)})</h1>
        {group.curator && (
          <p className="text-lg italic">Куратор: {group.curator.name}</p>
        )}
      </div>

      <Card className="print:border-none print:shadow-none">
        <CardHeader className="print:hidden">
          <CardTitle className="flex items-center gap-2">
            <IconUsersGroup size={20} className="text-primary" />
            {translate("ui.groupMembers")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">№</TableHead>
                <TableHead>{translate("ui.fullName")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.students.map((student, index) => (
                <TableRow key={student.id}>
                  <TableCell className="text-center font-mono text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <IconUser size={14} className="text-muted-foreground print:hidden" />
                      {student.name}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {group.students.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="h-32 text-center text-muted-foreground">
                    {translate("ui.thisGroupHasNoStudentsYet")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="hidden print:block mt-8 text-sm text-muted-foreground">
        Дата выгрузки: {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}
