"use client";

import { useTransition } from "react";
import { translate } from "@/lib/i18n/translate";
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
          tooltip={isCancel ? translate("ui.cancelTheWriteOff") : translate("ui.writeOffEarly")}
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
            {isCancel ? translate("ui.cancelTheWriteOffOfThisPenalty") : translate("ui.writeOffThisPenaltyEarly")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isCancel
              ? translate("ui.thePenaltyWillCountAsActiveAgain")
              : translate("ui.thePenaltyStaysOnTheRecordMarkedAs")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{translate("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={run} disabled={pending}>
            {pending ? translate("common.saving") : isCancel ? translate("ui.cancelTheWriteOff") : translate("record.writeOff")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
