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
import { createGroup, createGroupsBulk } from "@/lib/actions/admin";
import { useRefresh } from "@/lib/use-refresh";
import { cn } from "@/lib/utils";
import { formatCourse } from "@/lib/group-course";


// Radix Select запрещает пустое значение у SelectItem — используем sentinel.
const NONE = "__none__";

interface Props {
  teachers: { id: string; name: string }[];
  specialties: { id: string; name: string; abbreviation: string; letter: string }[];
}

type Mode = "single" | "bulk";

function pluralGroups(n: number) {
  if (n === 1) return "группу";
  if (n >= 2 && n <= 4) return "группы";
  if (n % 100 >= 11 && n % 100 <= 19) return "групп";
  const mod = n % 10;
  if (mod === 1) return "группу";
  if (mod >= 2 && mod <= 4) return "группы";
  return "групп";
}

export function CreateGroupDialog({ teachers, specialties }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("single");
  const [pending, startTransition] = useTransition();
  const refresh = useRefresh();

  // Single
  const [singleDigits, setSingleDigits] = useState("");
  const [curatorId, setCuratorId] = useState("");
  const [singleSpecialtyId, setSingleSpecialtyId] = useState("");
  // Пока специальность не выбрана вручную — подставляем по букве названия.
  const [singleSpecialtyTouched, setSingleSpecialtyTouched] = useState(false);
  const [singleError, setSingleError] = useState("");

  // Bulk
  const [letter, setLetter] = useState("");
  const [bulkSpecialtyId, setBulkSpecialtyId] = useState("");
  const [digit1, setDigit1] = useState("");
  const [digit2, setDigit2] = useState("");
  const [count, setCount] = useState("1");
  const [bulkError, setBulkError] = useState("");

  const selectedSpecialty = specialties.find((s) => s.id === singleSpecialtyId);
  const generatedSingleName =
    selectedSpecialty?.letter && singleDigits.length === 3
      ? `${selectedSpecialty.letter.toUpperCase()}-${singleDigits}`
      : "";

  function handleSpecialtyChange(specialtyId: string) {
    setBulkSpecialtyId(specialtyId);
    const sp = specialties.find((s) => s.id === specialtyId);
    if (sp?.letter) setLetter(sp.letter);
  }

  function handleOpenChange(v: boolean) {
    if (!v) {
      setSingleDigits("");
      setCuratorId("");
      setSingleSpecialtyId("");
      setSingleSpecialtyTouched(false);
      setSingleError("");
      setLetter("");
      setBulkSpecialtyId("");
      setDigit1("");
      setDigit2("");
      setCount("1");
      setBulkError("");
      setMode("single");
    }
    setOpen(v);
  }

  function previewNames(): string[] {
    const d1 = digit1.trim();
    const d2 = digit2.trim();
    const n = parseInt(count, 10);
    if (
      !letter.trim() ||
      d1.length !== 1 ||
      d2.length !== 1 ||
      isNaN(n) ||
      n < 1
    ) {
      return [];
    }
    const out: string[] = [];
    for (let i = 1; i <= Math.min(n, 99); i++) {
      out.push(`${letter.trim().toUpperCase()}-${d1}${d2}${i}`);
    }
    return out;
  }

  function handleSingle() {
    setSingleError("");
    if (!generatedSingleName) {
      if (!singleSpecialtyId) return setSingleError("Выберите специальность");
      if (singleDigits.length !== 3)
        return setSingleError("Введите 3 цифры (например, 395)");
      return;
    }

    startTransition(async () => {
      try {
        const res = await createGroup({
          name: generatedSingleName,
          curatorId: curatorId || undefined,
          specialtyId: singleSpecialtyId || undefined,
        });
        if (!res.ok) {
          setSingleError(res.error ?? "Не удалось создать группу");
          return;
        }
        refresh();
        handleOpenChange(false);
      } catch (err: unknown) {
        setSingleError(err instanceof Error ? err.message : "Ошибка");
      }
    });
  }

  function handleBulk() {
    setBulkError("");
    const l = letter.trim();
    const d1 = digit1.trim();
    const d2 = digit2.trim();
    const n = parseInt(count, 10);

    if (!l) return setBulkError("Введите букву");
    if (d1.length !== 1 || !/[0-9]/.test(d1))
      return setBulkError("Первая цифра - один символ 0-9");
    if (d2.length !== 1 || !/[0-9]/.test(d2))
      return setBulkError("Вторая цифра - один символ 0-9");
    if (isNaN(n) || n < 1 || n > 99)
      return setBulkError("Количество от 1 до 99");

    const names = previewNames();
    if (!names.length) return setBulkError("Нет групп для создания");

    startTransition(async () => {
      try {
        const { results } = await createGroupsBulk(
          names.map((nm) => ({ name: nm, specialtyId: bulkSpecialtyId || undefined })),
        );
        const failed = results.filter((r) => !r.ok);
        if (failed.length === 0) {
          refresh();
          handleOpenChange(false);
        } else if (failed.length === results.length) {
          setBulkError(
            `Не удалось создать ни одной группы (${failed[0].error})`,
          );
        } else {
          setBulkError(
            `Создано ${results.length - failed.length} из ${results.length}. Остальные: ${failed[0].error}`,
          );
          refresh();
        }
      } catch (err: unknown) {
        setBulkError(err instanceof Error ? err.message : "Ошибка");
      }
    });
  }

  const preview = previewNames();
  const bulkValid = preview.length > 0;

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <IconPlus size={16} />
        Создать группу
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Создание группы</DialogTitle>
          </DialogHeader>

          <div className="flex gap-1 rounded-md border bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => setMode("single")}
              className={cn(
                "flex-1 rounded-sm px-3 py-1.5 text-sm transition-colors",
                mode === "single"
                  ? "bg-background shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Одна группа
            </button>
            <button
              type="button"
              onClick={() => setMode("bulk")}
              className={cn(
                "flex-1 rounded-sm px-3 py-1.5 text-sm transition-colors",
                mode === "bulk"
                  ? "bg-background shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Несколько по алгоритму
            </button>
          </div>

          {mode === "single" ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <Label required>Специальность</Label>
                <Select
                  value={singleSpecialtyId || NONE}
                  onValueChange={(v) => {
                    setSingleSpecialtyId(v === NONE ? "" : v);
                    setSingleSpecialtyTouched(true);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="- не выбрана -" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>- не выбрана -</SelectItem>
                    {specialties.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.abbreviation || s.name}
                        {s.letter ? ` (${s.letter})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label required>Три цифры (последние в названии)</Label>
                <Input
                  value={singleDigits}
                  onChange={(e) =>
                    setSingleDigits(e.target.value.replace(/\D/g, "").slice(0, 3))
                  }
                  placeholder="395"
                  autoFocus
                />
                {generatedSingleName && (
                  <div className="rounded-md border bg-muted/30 px-3 py-2 mt-1">
                    <p className="text-xs text-muted-foreground">
                      Будет создана группа:
                    </p>
                    <p className="text-sm font-medium">
                      {generatedSingleName}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        ({formatCourse(generatedSingleName)})
                      </span>
                    </p>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <Label>Куратор</Label>
                <Select
                  value={curatorId || NONE}
                  onValueChange={(v) => setCuratorId(v === NONE ? "" : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="- не назначен -" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>- не назначен -</SelectItem>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {singleError && (
                <p className="text-xs text-destructive">{singleError}</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <Label required>Специальность</Label>
                <Select
                  value={bulkSpecialtyId || NONE}
                  onValueChange={(v) => handleSpecialtyChange(v === NONE ? "" : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="- не выбрана -" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>- не выбрана -</SelectItem>
                    {specialties.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.abbreviation || s.name}
                        {s.letter ? ` (${s.letter})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-2">
                <div className="flex flex-col gap-1">
                  <Label required>Буква</Label>
                  <Input
                    value={letter}
                    onChange={(e) => setLetter(e.target.value.slice(0, 1))}
                    placeholder="А"
                    maxLength={1}
                    className="text-center"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label required>Цифра 1</Label>
                  <Input
                    value={digit1}
                    onChange={(e) =>
                      setDigit1(e.target.value.replace(/\D/g, "").slice(0, 1))
                    }
                    placeholder="2"
                    maxLength={1}
                    className="text-center"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label required>Цифра 2</Label>
                  <Input
                    value={digit2}
                    onChange={(e) =>
                      setDigit2(e.target.value.replace(/\D/g, "").slice(0, 1))
                    }
                    placeholder="4"
                    maxLength={1}
                    className="text-center"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label required>Кол-во</Label>
                  <Input
                    value={count}
                    onChange={(e) =>
                      setCount(e.target.value.replace(/\D/g, "").slice(0, 2))
                    }
                    placeholder="3"
                    maxLength={2}
                    className="text-center"
                  />
                </div>
              </div>
              {bulkValid && (
                <div className="rounded-md border bg-muted/30 px-3 py-2">
                  <p className="mb-1 text-xs text-muted-foreground">
                    Будет создано {preview.length}{" "}
                    {pluralGroups(preview.length)}:
                  </p>
                  <p className="text-sm font-medium">{preview.join(", ")}</p>
                </div>
              )}
              {bulkError && (
                <p className="text-xs text-destructive">{bulkError}</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={pending}
            >
              Отмена
            </Button>
            {mode === "single" ? (
              <Button onClick={handleSingle} disabled={pending}>
                {pending ? "Создание..." : "Создать"}
              </Button>
            ) : (
              <Button onClick={handleBulk} disabled={pending || !bulkValid}>
                {pending
                  ? "Создание..."
                  : bulkValid
                    ? `Создать ${preview.length} ${pluralGroups(preview.length)}`
                    : "Создать"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
