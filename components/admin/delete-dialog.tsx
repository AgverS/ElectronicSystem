"use client";

import { useTransition } from "react";
import { IconTrash } from "@tabler/icons-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { IconBtn } from "@/components/ui/icon-btn";
import { useRefresh } from "@/lib/use-refresh";

interface DeleteDialogProps {
  action: () => Promise<void>;
  label?: string;
}

export function DeleteDialog({ action, label = "Удалить" }: DeleteDialogProps) {
  const [pending, startTransition] = useTransition();
  const refresh = useRefresh();

  function handleDelete() {
    startTransition(async () => {
      await action();
      refresh();
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <IconBtn
          tooltip={label}
          className="text-destructive/70 hover:text-destructive hover:bg-destructive/10"
        >
          <IconTrash size={15} />
        </IconBtn>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{label}?</AlertDialogTitle>
          <AlertDialogDescription>
            Это действие нельзя отменить.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleDelete}
            disabled={pending}
          >
            {pending ? "Удаление..." : "Удалить"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
