"use client";

import { useRef, useState, useTransition } from "react";
import { translate } from "@/lib/i18n/translate";
import {
  IconPlus,
  IconPencil,
  IconX,
  IconPaperclip,
  IconTrash,
} from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconBtn } from "@/components/ui/icon-btn";
import { cn } from "@/lib/utils";
import { RecordKind } from "@/lib/prisma-client";
import { RECORD_KIND_LABELS } from "@/lib/records";
import {
  createStudentRecord,
  updateStudentRecord,
  deleteRecordAttachment,
} from "@/lib/actions/records";

const ACCEPT = "application/pdf,image/png,image/jpeg,image/webp";

const TEXTAREA_CLS =
  "min-h-20 w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export interface RecordForForm {
  id: string;
  kind: RecordKind;
  number: string;
  date: string;
  reason: string;
  attachments: { id: string; fileName: string; mimeType: string }[];
}

interface Props {
  mode: "create" | "edit";
  studentId?: string;
  record?: RecordForForm;
  onSaved: () => void;
}

function toDateInput(value: string): string {
  // @db.Date serialises as an ISO string at UTC midnight - take the date part.
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

export function StudentRecordFormDialog({
  mode,
  studentId,
  record,
  onSaved,
}: Props) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<RecordKind>(
    record?.kind ?? RecordKind.REWARD,
  );
  const [number, setNumber] = useState((record?.number ?? "").replace(/^\s*№\s*/, ""));
  const [date, setDate] = useState(toDateInput(record?.date ?? ""));
  const [reason, setReason] = useState(record?.reason ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [existing, setExisting] = useState(record?.attachments ?? []);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setKind(record?.kind ?? RecordKind.REWARD);
    setNumber((record?.number ?? "").replace(/^\s*№\s*/, ""));
    setDate(toDateInput(record?.date ?? ""));
    setReason(record?.reason ?? "");
    setFiles([]);
    setExisting(record?.attachments ?? []);
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (next) reset();
    setOpen(next);
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeNewFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function removeExisting(id: string) {
    startTransition(async () => {
      try {
        await deleteRecordAttachment(id);
        setExisting((prev) => prev.filter((a) => a.id !== id));
        onSaved();
      } catch (err) {
        setError(err instanceof Error ? err.message : translate("ui.couldNotDeleteTheFile"));
      }
    });
  }

  function handleSubmit() {
    if (!number.trim()) return setError(translate("ui.enterTheOrderNumber"));
    if (!date) return setError(translate("ui.enterTheOrderDate"));
    if (!reason.trim()) return setError(translate("ui.enterAReason"));

    const formData = new FormData();
    formData.set("kind", kind);
    formData.set("number", number.trim());
    formData.set("date", date);
    formData.set("reason", reason.trim());
    if (mode === "create") {
      formData.set("studentId", studentId ?? "");
    } else {
      formData.set("id", record?.id ?? "");
    }
    for (const file of files) formData.append("files", file);

    startTransition(async () => {
      try {
        if (mode === "create") {
          await createStudentRecord(formData);
        } else {
          await updateStudentRecord(formData);
        }
        onSaved();
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : translate("ui.couldNotSave"));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button className="gap-2">
            <IconPlus size={16} />
            {translate("common.create")}
          </Button>
        ) : (
          <IconBtn tooltip={translate("common.edit")}>
            <IconPencil size={15} />
          </IconBtn>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg gap-4">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? translate("ui.newRecord") : translate("ui.editTheRecord")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {/* Kind toggle */}
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(RECORD_KIND_LABELS) as RecordKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={cn(
                  "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                  kind === k
                    ? "border-ring bg-muted text-foreground"
                    : "border-input text-muted-foreground hover:bg-muted/50",
                )}
              >
                {RECORD_KIND_LABELS[k]}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <Label required className="text-xs font-medium text-muted-foreground">
                {translate("ui.orderNumber")}
              </Label>
              <Input
                value={number}
                onChange={(e) =>
                  setNumber(e.target.value.replace(/^\s*№\s*/, ""))
                }
                placeholder={translate("ui.r12")}
                className="h-9"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label required className="text-xs font-medium text-muted-foreground">
                {translate("ui.orderDate")}
              </Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label required className="text-xs font-medium text-muted-foreground">
              {translate("record.reason")}
            </Label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={translate("ui.whatTheOrderIsFor")}
              className={TEXTAREA_CLS}
            />
          </div>

          {/* Existing attachments (edit mode) */}
          {existing.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {translate("ui.attachedFiles")}
              </span>
              {existing.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-2 rounded-md border px-2 py-1 text-sm"
                >
                  <IconPaperclip
                    size={14}
                    className="shrink-0 text-muted-foreground"
                  />
                  <span className="flex-1 truncate">{a.fileName}</span>
                  <button
                    type="button"
                    onClick={() => removeExisting(a.id)}
                    disabled={pending}
                    className="text-muted-foreground transition-colors hover:text-destructive disabled:opacity-40"
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* New files to upload */}
          <div className="flex flex-col gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPT}
              onChange={(e) => addFiles(e.target.files)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-fit items-center gap-1.5 rounded-md border border-dashed px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <IconPaperclip size={14} />
              {translate("ui.attachFiles")}
            </button>

            {files.map((file, i) => (
              <div
                key={`${file.name}-${i}`}
                className="flex items-center gap-2 rounded-md border px-2 py-1 text-sm"
              >
                <IconPaperclip
                  size={14}
                  className="shrink-0 text-muted-foreground"
                />
                <span className="flex-1 truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeNewFile(i)}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                >
                  <IconX size={14} />
                </button>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              {translate("ui.pdfOrImagesUpTo10MbEach")}
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            {translate("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending ? translate("common.saving") : translate("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
