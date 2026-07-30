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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addLesson } from "@/lib/actions/teacher";
import { useRefresh } from "@/lib/use-refresh";

interface AddLessonDialogProps {
  assignmentId: string;
  groupName: string;
  groupYear?: number;
  semester: { startDate: Date; endDate: Date };
  isPractical?: boolean;
}

export function AddLessonDialog({
  assignmentId,
  groupYear,
  semester,
  isPractical,
}: AddLessonDialogProps) {
  const minDate = new Date(semester.startDate).toISOString().split("T")[0];
  const maxDate = new Date(semester.endDate).toISOString().split("T")[0];

  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(() => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    if (todayStr >= minDate && todayStr <= maxDate) return todayStr;
    return minDate;
  });
  const [topic, setTopic] = useState("");
  const [type, setType] = useState(isPractical ? "practical" : "lecture");
  // Строка, а не число: иначе на каждое нажатие поле «зажимается» в диапазон и
  // не даёт стереть значение, чтобы ввести другое.
  const [count, setCount] = useState("1");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const refresh = useRefresh();

  const countNum = Math.min(20, Math.max(1, Number(count) || 1));

  const isOKRAllowed = !isPractical && groupYear !== 1;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!date) {
      setError(translate("ui.enterADate"));
      return;
    }
    startTransition(async () => {
      try {
        await addLesson({
          assignmentId,
          date,
          type,
          topic: topic || undefined,
          count: countNum,
        });
        refresh();
        setTopic("");
        setCount("1");
        setOpen(false);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : translate("common.error"));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">{translate("ui.addALesson")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{translate("ui.newLesson")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 pt-2">
          <div className="flex flex-col gap-1">
            <Label required>{translate("common.date")}</Label>
            <Input
              type="date"
              value={date}
              min={minDate}
              max={maxDate}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {!isPractical && (
            <div className="flex flex-col gap-1">
              <Label required>{translate("ui.lessonType")}</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lecture">{translate("lessonType.lecture")}</SelectItem>
                  <SelectItem value="practical">{translate("lessonType.practical")}</SelectItem>
                  <SelectItem value="lab">{translate("nav.labs")}</SelectItem>
                  {isOKRAllowed && <SelectItem value="assessment">{translate("lessonType.assessment")}</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <Label>{translate("ui.numberOfLessons")}</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={20}
                value={count}
                onChange={(e) => {
                  const v = e.target.value;
                  // Пускаем пустое поле и любые цифры — правим диапазон при blur.
                  if (v === "" || /^\d{1,2}$/.test(v)) setCount(v);
                }}
                onBlur={() => setCount(String(countNum))}
                className="flex-1"
              />
              {[1, 2, 4].map((n) => (
                <Button
                  key={n}
                  type="button"
                  variant={countNum === n ? "default" : "outline"}
                  size="icon"
                  onClick={() => setCount(String(n))}
                  aria-label={`${n} уроков`}
                >
                  {n}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {translate("ui.thisManyColumnsWillBeAddedAtOnce")}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <Label>{translate("ui.topicOptional")}</Label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={translate("ui.lessonTopic")}
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" disabled={pending}>
            {pending
              ? translate("ui.adding")
              : countNum > 1
                ? `Добавить ${countNum} ${countNum >= 5 ? translate("ui.lessons") : translate("ui.lessons2")}`
                : translate("common.add")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
