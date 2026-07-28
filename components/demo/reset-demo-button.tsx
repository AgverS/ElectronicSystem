"use client";

import * as React from "react";
import { toast } from "sonner";
import { IconRefresh } from "@tabler/icons-react";
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
import { resetDemoData } from "@/lib/demo-db/client";
import { useT } from "@/lib/i18n/provider";

/** Restores the seeded dataset, undoing everything the visitor has changed. */
export function ResetDemoButton() {
  const t = useT();

  return (
    <AlertDialog>
      <AlertDialogTrigger
        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title={t("demo.reset")}
        aria-label={t("demo.reset")}
      >
        <IconRefresh size={16} />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("demo.reset.confirm.title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("demo.reset.confirm.body")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              resetDemoData();
              toast.success(t("demo.reset.done"));
            }}
          >
            {t("demo.reset")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
