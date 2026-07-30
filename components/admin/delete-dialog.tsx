"use client";

import { useTransition } from "react";
import { translate } from "@/lib/i18n/translate";
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

export function DeleteDialog({ action, label = translate("common.delete") }: DeleteDialogProps) {
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
            {translate("ui.thisCannotBeUndone")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{translate("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleDelete}
            disabled={pending}
          >
            {pending ? translate("ui.deleting") : translate("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
