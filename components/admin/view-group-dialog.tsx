"use client";

import { useState } from "react";
import { translate } from "@/lib/i18n/translate";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { IconEye, IconUser, IconLoader2 } from "@tabler/icons-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Role } from "@/lib/prisma-client";
import { UserDetailsDialog } from "./user-details-dialog";

interface Student {
  id: string;
  name: string;
  username: string | null;
}

interface Props {
  groupId: string;
  groupName: string;
}

export function ViewGroupDialog({ groupId, groupName }: Props) {
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-group-students", groupId],
    queryFn: async () => {
      const params = new URLSearchParams({
        groupId,
        role: Role.STUDENT,
        limit: "100",
      });
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch students");
      return res.json() as Promise<{ data: Student[] }>;
    },
    enabled: open,
  });

  const students = data?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <IconEye size={16} />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Состав группы {groupName}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <IconLoader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : students.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {translate("ui.thisGroupHasNoStudentsYet")}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">№</TableHead>
                  <TableHead>{translate("ui.fullName")}</TableHead>
                  <TableHead>{translate("ui.username")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s, i) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {i + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      <UserDetailsDialog
                        userId={s.id}
                        userName={s.name}
                        trigger={
                          <button
                            type="button"
                            className="flex items-center gap-2 text-left hover:text-primary transition-colors cursor-pointer select-none"
                          >
                            <IconUser size={14} className="text-muted-foreground" />
                            <span>{s.name}</span>
                          </button>
                        }
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {s.username}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
