"use client";

import { useState } from "react";
import { IconPencil } from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { IconBtn } from "@/components/ui/icon-btn";
import { UserForm } from "./user-form";
import { Role } from "@/lib/prisma-client";

interface EditUserDialogProps {
  user: {
    id: string;
    name: string;
    username: string | null;
    role: Role;
    groupId: string | null;
    specialties: { id: string; name: string; abbreviation: string }[];
    subjects: { id: string; name: string }[];
    curatedGroups: { id: string }[];
  };
  groups: { id: string; name: string }[];
  specialties: { id: string; name: string; abbreviation: string }[];
  isMasterActor?: boolean;
}

export function EditUserDialog({
  user,
  groups,
  specialties,
  isMasterActor = false,
}: EditUserDialogProps) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <IconBtn tooltip="Редактировать">
          <IconPencil size={15} />
        </IconBtn>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Редактировать пользователя</DialogTitle>
        </DialogHeader>
        <UserForm
          groups={groups}
          allSpecialties={specialties}
          initial={{
            id: user.id,
            name: user.name,
            username: user.username,
            role: user.role,
            groupId: user.groupId,
            specialtyIds: user.specialties.map((s) => s.id),
            curatedGroupIds: user.curatedGroups.map((g) => g.id),
          }}
          onDone={() => setOpen(false)}
          isMasterActor={isMasterActor}
        />
      </DialogContent>
    </Dialog>
  );
}
