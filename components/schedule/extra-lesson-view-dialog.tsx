"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { IconTrash, IconUsers } from "@tabler/icons-react";
import { deleteExtraLesson, getExtraLessonRsvps, toggleExtraLessonRsvp } from "@/lib/actions/extra-lessons";
import type { ExtraLessonEntry } from "@/components/schedule/week-schedule-table";
import { shortName } from "@/lib/utils";

interface RsvpRow {
  id: string;
  studentId: string;
  student: { id: string; name: string; group: { name: string } | null };
}

interface TeacherViewProps {
  role: "teacher";
  lesson: ExtraLessonEntry;
  onClose: () => void;
  onDeleted: () => void;
}

interface StudentViewProps {
  role: "student";
  lesson: ExtraLessonEntry;
  onClose: () => void;
  onRsvpChanged: (id: string, attending: boolean) => void;
}

type Props = TeacherViewProps | StudentViewProps;

export function ExtraLessonViewDialog(props: Props) {
  const { lesson, onClose } = props;
  const [rsvps, setRsvps] = useState<RsvpRow[] | null>(null);
  const [showRsvps, setShowRsvps] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [y, m, d] = lesson.date.split("-");
  const dateLabel = `${d}.${m}.${y}`;

  function loadRsvps() {
    startTransition(async () => {
      try {
        const data = await getExtraLessonRsvps(lesson.id);
        setRsvps(data as RsvpRow[]);
        setShowRsvps(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteExtraLesson(lesson.id);
        if (props.role === "teacher") props.onDeleted();
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка");
      }
    });
  }

  function handleRsvp() {
    startTransition(async () => {
      try {
        const attending = await toggleExtraLessonRsvp(lesson.id);
        if (props.role === "student") props.onRsvpChanged(lesson.id, attending);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка");
      }
    });
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Дополнительное занятие</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 text-sm">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <div className="text-muted-foreground">Дата</div>
            <div className="font-medium">{dateLabel}, урок {lesson.lessonNumber}</div>
            <div className="text-muted-foreground">Преподаватель</div>
            <div className="font-medium">{lesson.teacher.name}</div>
            <div className="text-muted-foreground">Кабинет</div>
            <div className="font-medium">{lesson.room}</div>
            {lesson.group && (
              <>
                <div className="text-muted-foreground">Группа</div>
                <div className="font-medium">{lesson.group.name}</div>
              </>
            )}
            {!lesson.group && (
              <>
                <div className="text-muted-foreground">Группа</div>
                <div className="text-muted-foreground italic">Все группы</div>
              </>
            )}
          </div>

          {lesson.comment && (
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              {lesson.comment}
            </div>
          )}

          {props.role === "teacher" && (
            <div>
              <button
                onClick={loadRsvps}
                disabled={isPending}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <IconUsers size={14} />
                {showRsvps ? `Участники (${rsvps?.length ?? lesson.rsvpCount})` : `Показать участников (${lesson.rsvpCount})`}
              </button>
              {showRsvps && rsvps && (
                <div className="mt-2 flex flex-col gap-1">
                  {rsvps.length === 0 ? (
                    <p className="text-muted-foreground text-xs">Никто не отметился</p>
                  ) : (
                    rsvps.map((r) => (
                      <div key={r.id} className="flex items-center justify-between text-sm">
                        <span>{shortName(r.student.name)}</span>
                        {r.student.group && (
                          <span className="text-xs text-muted-foreground">{r.student.group.name}</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {props.role === "student" && (
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="text-sm">
                {lesson.rsvpCount > 0 ? `${lesson.rsvpCount} чел. придут` : "Пока никто не отметился"}
              </span>
              <Button
                size="sm"
                variant={lesson.myRsvp ? "default" : "outline"}
                onClick={handleRsvp}
                disabled={isPending}
              >
                {lesson.myRsvp ? "✓ Приду" : "Приду"}
              </Button>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          {props.role === "teacher" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={isPending}
              className="text-destructive hover:text-destructive mr-auto"
            >
              <IconTrash size={14} className="mr-1" />
              Удалить
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
