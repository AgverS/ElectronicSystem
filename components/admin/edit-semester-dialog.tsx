"use client";

import { useState, useTransition } from "react";
import { translate } from "@/lib/i18n/translate";
import { IconPencil } from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { IconBtn } from "@/components/ui/icon-btn";
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
import { updateSemester } from "@/lib/actions/admin";
import { useRefresh } from "@/lib/use-refresh";
import { getAcademicYear } from "@/lib/semester-utils";

interface EditSemesterDialogProps {
  semester: {
    id: string;
    name: string;
    number: number;
    year: string;
    startDate: Date;
    endDate: Date;
  };
}

function toInputDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function EditSemesterDialog({ semester }: EditSemesterDialogProps) {
  const [open, setOpen] = useState(false);
  const [number, setNumber] = useState(String(semester.number));
  const [startDate, setStartDate] = useState(toInputDate(semester.startDate));
  const [endDate, setEndDate] = useState(toInputDate(semester.endDate));
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const refresh = useRefresh();

  function handleSave(e: React.FormEvent) {
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
    const num = parseInt(number);
    const name = translate("ui.semesterNameBuilt", { number: num, year: academicYear });

    startTransition(async () => {
      try {
        await updateSemester(semester.id, { name, number: num, year: academicYear, startDate, endDate });
        refresh();
        setOpen(false);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : translate("common.error"));
      }
    });
  }


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <IconBtn tooltip={translate("common.edit")}>
          <IconPencil size={15} />
        </IconBtn>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{translate("ui.editTheSemester")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="flex flex-col gap-3 pt-2">
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
          <div className="flex flex-col gap-1">
            <Label required>{translate("bells.start")}</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label required>{translate("bells.end")}</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{translate("common.cancel")}</Button>
            <Button type="submit" disabled={pending}>{pending ? translate("common.saving") : translate("common.save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
