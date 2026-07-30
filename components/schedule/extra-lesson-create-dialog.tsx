"use client";

import { useState, useTransition } from "react";
import { translate } from "@/lib/i18n/translate";
import { useQuery } from "@tanstack/react-query";
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
import { createExtraLesson } from "@/lib/actions/extra-lessons";

const TEXTAREA_CLS =
  "min-h-16 w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

interface Props {
  open: boolean;
  onClose: () => void;
  date: string;
  lessonNumber: number;
  onCreated: () => void;
}

interface Group {
  id: string;
  name: string;
}

export function ExtraLessonCreateDialog({ open, onClose, date, lessonNumber, onCreated }: Props) {
  const [room, setRoom] = useState("");
  const [comment, setComment] = useState("");
  const [groupId, setGroupId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ["groups-list"],
    queryFn: async () => (await fetch("/api/groups")).json(),
    enabled: open,
  });

  function handleClose() {
    setRoom("");
    setComment("");
    setGroupId("");
    setError(null);
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!room.trim()) {
      setError(translate("ui.enterARoom"));
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await createExtraLesson({
          date,
          lessonNumber,
          room: room.trim(),
          comment: comment.trim() || undefined,
          groupId: groupId || undefined,
        });
        onCreated();
        handleClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : translate("common.error"));
      }
    });
  }

  const [y, m, d] = date.split("-");
  const dateLabel = `${d}.${m}.${y}`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{translate("audit.entity.extra_lesson")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">{translate("ui.date")}</span> {dateLabel}
            </div>
            <div>
              <span className="font-medium text-foreground">{translate("ui.lesson")}</span> {lessonNumber}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="el-room">{translate("ui.room")}</Label>
            <Input
              id="el-room"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="301"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="el-group">{translate("ui.groupOptional")}</Label>
            <select
              id="el-group"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              <option value="">{translate("ui.allGroupsITeach")}</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="el-comment">{translate("ui.comment")}</Label>
            <textarea
              id="el-comment"
              className={TEXTAREA_CLS}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={translate("ui.topicPreparation")}
              rows={3}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              {translate("common.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? translate("ui.creating") : translate("common.add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
