"use client";

import { useState, useTransition } from "react";
import { translate } from "@/lib/i18n/translate";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconPlus } from "@tabler/icons-react";
import { createSemester } from "@/lib/actions/admin";
import { useRefresh } from "@/lib/use-refresh";
import { getAcademicYear } from "@/lib/semester-utils";


export function CreateSemesterDialog() {
  const [open, setOpen] = useState(false);
  const [number, setNumber] = useState("1");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isCurrent, setIsCurrent] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const refresh = useRefresh();

  function handleOpenChange(v: boolean) {
    if (!v) {
      setNumber("1");
      setStartDate("");
      setEndDate("");
      setIsCurrent(false);
      setError("");
    }
    setOpen(v);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!startDate) { setError(translate("ui.enterAValidStartDate")); return; }
    if (!endDate) { setError(translate("ui.enterAValidEndDate31JuneFor")); return; }

    if (new Date(startDate) >= new Date(endDate)) {
      setError(translate("ui.theStartDateMustComeBeforeTheEnd"));
      return;
    }

    const start = new Date(startDate);
    const academicYear = getAcademicYear(start);
    const num = parseInt(number, 10);
    const name = translate("ui.semesterNameBuilt", { number: num, year: academicYear });

    startTransition(async () => {
      try {
        await createSemester({ name, number: num, year: academicYear, startDate, endDate });
        refresh();
        handleOpenChange(false);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : translate("common.error"));
      }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <IconPlus size={16} />
        {translate("ui.createTheSemester")}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{translate("ui.newSemester")}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label required>{translate("ui.semesterNumber")}</Label>
              <Select value={number} onValueChange={setNumber}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label required>{translate("bells.start")}</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label required>{translate("bells.end")}</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={pending}
              >
                {translate("common.cancel")}
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? translate("ui.creating") : translate("common.create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
