"use client";

import { useTransition } from "react";
import { IconKey } from "@tabler/icons-react";
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
import { resetUserPassword } from "@/lib/actions/admin";
import { toast } from "sonner";

interface ResetPasswordDialogProps {
  userId: string;
  userName: string;
}

export function ResetPasswordDialog({ userId, userName }: ResetPasswordDialogProps) {
  const [pending, startTransition] = useTransition();
  const refresh = useRefresh();

  function handleReset() {
    startTransition(async () => {
      try {
        await resetUserPassword(userId);
        toast.success(`Пароль для ${userName} сброшен`);
        refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Ошибка сброса пароля");
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <IconBtn
          tooltip="Сбросить пароль"
          className="text-muted-foreground hover:text-foreground"
        >
          <IconKey size={15} />
        </IconBtn>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Сбросить пароль?</AlertDialogTitle>
          <AlertDialogDescription>
            Пароль пользователя {userName} будет удалён. При следующем входе ему потребуется установить новый пароль.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReset}
            disabled={pending}
          >
            {pending ? "Сброс..." : "Сбросить"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
