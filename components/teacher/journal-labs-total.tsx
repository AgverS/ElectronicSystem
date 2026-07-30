"use client";

import { useState, useTransition } from "react";
import { translate } from "@/lib/i18n/translate";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconPencil, IconFlask } from "@tabler/icons-react";
import { setLabsTotal } from "@/lib/actions/teacher";
import { useRefresh } from "@/lib/use-refresh";

interface JournalLabsTotalProps {
  assignmentId: string;
  issued: number;
  total: number | null;
  canEdit: boolean;
}

export function JournalLabsTotal({
  assignmentId,
  issued,
  total,
  canEdit,
}: JournalLabsTotalProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(total != null ? String(total) : "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const refresh = useRefresh();

  function handleOpenChange(next: boolean) {
    if (next) {
      setValue(total != null ? String(total) : "");
      setError("");
    }
    setOpen(next);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const t = value.trim() === "" ? null : Number(value);
    if (t != null && (!Number.isInteger(t) || t < 0)) {
      setError(translate("ui.enterAWholeNumberZeroOrMore"));
      return;
    }
    startTransition(async () => {
      try {
        await setLabsTotal({ assignmentId, total: t });
        refresh();
        setOpen(false);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : translate("common.error"));
      }
    });
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <IconFlask size={15} className="shrink-0" />
      {total != null ? (
        <span>
          Лабы:{" "}
          <strong className="text-foreground">
            {issued} / {total}
          </strong>
        </span>
      ) : (
        <span>
          {translate("ui.set")} <strong className="text-foreground">{issued}</strong> · план не
          задан
        </span>
      )}

      {canEdit && (
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <button
              type="button"
              aria-label={translate("ui.changeTheNumberOfLaboratoryWorks")}
              className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <IconPencil size={14} />
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{translate("ui.laboratoryWorksInTotal")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 pt-2">
              <div className="flex flex-col gap-1">
                <Label>{translate("ui.laboratoryWorksPlanned")}</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={translate("ui.forExample12")}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  {translate("ui.howManyLaboratoryWorksThereShouldBeThis")}
                </p>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button type="submit" disabled={pending}>
                {pending ? translate("common.saving") : translate("common.save")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </span>
  );
}
