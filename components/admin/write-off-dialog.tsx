"use client";

import { useTransition } from "react";
import { IconArchive, IconArrowBackUp } from "@tabler/icons-react";
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

interface WriteOffDialogProps {
  action: () => Promise<void>;
  mode: "writeoff" | "cancel";
}

export function WriteOffDialog({ action, mode }: WriteOffDialogProps) {
  const [pending, startTransition] = useTransition();
  const isCancel = mode === "cancel";

  function run() {
    startTransition(async () => {
      await action();
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <IconBtn
          tooltip={isCancel ? "Отменить списание" : "Списать досрочно"}
          className={
            isCancel
              ? "text-muted-foreground hover:bg-muted hover:text-foreground"
              : "text-primary/80 hover:bg-primary/10 hover:text-primary"
          }
        >
          {isCancel ? <IconArrowBackUp size={15} /> : <IconArchive size={15} />}
        </IconBtn>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isCancel ? "Отменить списание взыскания?" : "Списать взыскание досрочно?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isCancel
              ? "Взыскание снова станет действующим."
              : "Взыскание останется в истории и будет помечено как списанное, но перестанет считаться действующим. Удалять запись не нужно."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction onClick={run} disabled={pending}>
            {pending ? "Сохранение…" : isCancel ? "Отменить списание" : "Списать"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
