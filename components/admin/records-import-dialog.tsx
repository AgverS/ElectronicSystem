"use client";

import { useRef, useState } from "react";
import {
  IconUpload,
  IconCheck,
  IconAlertTriangle,
  IconX,
  IconArrowLeft,
} from "@tabler/icons-react";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { RecordKind } from "@/lib/prisma-client";
import { RECORD_KIND_LABELS, RECORD_KIND_COLORS } from "@/lib/records";
import { importStudentRecords, type ImportRow } from "@/lib/actions/records";
import type {
  DetectResult,
  ImportPreviewRow,
  ColumnMapping,
} from "@/app/api/admin/records/import/route";

interface Props {
  onImported: () => void;
}

type Step = "upload" | "map" | "preview" | "done";

const FIELD_LABELS: Record<keyof Omit<ColumnMapping, "hasHeader">, string> = {
  orderNumber: "№ приказа",
  name: "ФИО",
  kind: "Тип (взыскание/поощрение)",
  date: "Дата приказа",
  reason: "Основание",
};

type MappingState = Record<keyof Omit<ColumnMapping, "hasHeader">, number>;

const DEFAULT_MAPPING: MappingState = { orderNumber: 0, name: 1, kind: 2, date: 3, reason: 4 };

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

export function RecordsImportDialog({ onImported }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("upload");

  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [detect, setDetect] = useState<DetectResult | null>(null);
  const [mapping, setMapping] = useState<MappingState>(DEFAULT_MAPPING);
  const [hasHeader, setHasHeader] = useState(true);

  const [preview, setPreview] = useState<ImportPreviewRow[] | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);

  function reset() {
    setStep("upload");
    setFile(null);
    setDetect(null);
    setPreview(null);
    setError(null);
    setLoading(false);
    setImportedCount(0);
    setMapping(DEFAULT_MAPPING);
    setHasHeader(true);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleDetect() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("step", "detect");
      fd.append("file", file);
      const res = await fetch("/api/admin/records/import", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Ошибка чтения файла");
      const result = json as DetectResult;
      setDetect(result);
      setMapping(result.mapping as MappingState);
      setHasHeader(result.hasHeader);

      if (result.confident) {
        await runParse(file, result.mapping as MappingState, result.hasHeader);
      } else {
        setStep("map");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  async function runParse(f: File, map: MappingState, header: boolean) {
    const fd = new FormData();
    fd.append("step", "parse");
    fd.append("file", f);
    fd.append("mapping", JSON.stringify({ ...map, hasHeader: header } satisfies ColumnMapping));
    const res = await fetch("/api/admin/records/import", { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Ошибка парсинга");
    setPreview(json.rows);
    setStep("preview");
  }

  async function handleParse() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      await runParse(file, mapping, hasHeader);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!preview) return;
    const rows: ImportRow[] = preview
      .filter((r) => r.studentId && r.kind && r.date)
      .map((r) => ({
        orderNumber: r.orderNumber,
        kind: r.kind as RecordKind,
        reason: r.reason,
        studentId: r.studentId as string,
        date: r.date as string,
      }));
    if (!rows.length) { setError("Нет строк с совпавшими учащимися и датой"); return; }
    setLoading(true);
    setError(null);
    try {
      const { count } = await importStudentRecords(rows);
      setImportedCount(count);
      setStep("done");
      onImported();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка импорта");
    } finally {
      setLoading(false);
    }
  }

  const matched = preview?.filter((r) => r.studentId && r.kind && r.date).length ?? 0;
  const unmatched = preview?.filter((r) => !r.studentId || !r.kind || !r.date).length ?? 0;

  const colOptions = detect?.columns.map((c, i) => ({ label: c || `Столбец ${i + 1}`, value: i })) ?? [];

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <IconUpload size={15} />
          Импорт из файла
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl flex flex-col gap-0 p-0 max-h-[90vh]">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            {step !== "upload" && step !== "done" && (
              <button
                onClick={() => { setError(null); setStep(step === "preview" ? "map" : "upload"); }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <IconArrowLeft size={16} />
              </button>
            )}
            <DialogTitle>
              {step === "upload" && "Импорт поощрений и взысканий"}
              {step === "map"    && "Укажите столбцы"}
              {step === "preview" && "Предварительный просмотр"}
              {step === "done"   && "Импорт завершён"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-y-auto px-6 py-5">

          {/* ── Upload ────────────────────────────────────────────────────── */}
          {step === "upload" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label>Файл (CSV или XLSX)</Label>
                <Input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(null); }}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">
                  Столбцы: № приказа · ФИО · тип · дата · основание (порядок определяется автоматически)
                </p>
              </div>
              {error && <ErrorBanner message={error} />}
              <Button onClick={handleDetect} disabled={!file || loading} size="sm" className="self-start">
                {loading ? "Читаем файл…" : "Далее →"}
              </Button>
            </>
          )}

          {/* ── Mapping ───────────────────────────────────────────────────── */}
          {step === "map" && detect && (
            <>
              <div className="flex items-center gap-2">
                <input
                  id="hasHeader"
                  type="checkbox"
                  checked={hasHeader}
                  onChange={(e) => setHasHeader(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                />
                <Label htmlFor="hasHeader" className="cursor-pointer font-normal">
                  Первая строка — заголовки
                </Label>
              </div>

              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-48">Поле</TableHead>
                      <TableHead>Столбец из файла</TableHead>
                      <TableHead className="text-muted-foreground font-normal">Пример</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(Object.keys(FIELD_LABELS) as Array<keyof typeof FIELD_LABELS>).map((field) => {
                      const colIdx = mapping[field];
                      const sampleRow = detect.sampleRows[hasHeader ? 1 : 0];
                      const sampleVal = sampleRow?.[colIdx] ?? "—";
                      return (
                        <TableRow key={field}>
                          <TableCell className="font-medium">{FIELD_LABELS[field]}</TableCell>
                          <TableCell>
                            <Select
                              value={String(colIdx)}
                              onValueChange={(v) => setMapping((m) => ({ ...m, [field]: Number(v) }))}
                            >
                              <SelectTrigger className="w-48 h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {colOptions.map((opt) => (
                                  <SelectItem key={opt.value} value={String(opt.value)}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground truncate max-w-xs">
                            {sampleVal}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                  Первые строки файла
                </summary>
                <div className="mt-2 overflow-x-auto rounded-md border">
                  <table className="text-xs w-full">
                    <tbody>
                      {detect.sampleRows.map((row, ri) => (
                        <tr key={ri} className={ri === 0 && hasHeader ? "bg-muted/50 font-medium" : ""}>
                          {row.map((cell, ci) => (
                            <td
                              key={ci}
                              className={cn(
                                "border-r last:border-r-0 border-b px-2 py-1 max-w-[160px] truncate",
                                Object.values(mapping).includes(ci) && "bg-primary/5",
                              )}
                            >
                              {cell || <span className="text-muted-foreground/50">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>

              {error && <ErrorBanner message={error} />}
              <Button onClick={handleParse} disabled={loading} size="sm" className="self-start">
                {loading ? "Разбираем…" : "Разобрать →"}
              </Button>
            </>
          )}

          {/* ── Preview ───────────────────────────────────────────────────── */}
          {step === "preview" && preview && (
            <>
              <div className="flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1.5 text-green-700 dark:text-green-400">
                  <IconCheck size={14} />
                  {matched} совпали
                </span>
                {unmatched > 0 && (
                  <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                    <IconAlertTriangle size={14} />
                    {unmatched} не найдены — будут пропущены
                  </span>
                )}
              </div>

              <div className="rounded-md border overflow-hidden max-h-[50vh] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead className="w-24">№ приказа</TableHead>
                      <TableHead>ФИО в файле</TableHead>
                      <TableHead>Учащийся</TableHead>
                      <TableHead className="w-28">Тип</TableHead>
                      <TableHead className="w-24">Дата</TableHead>
                      <TableHead>Основание</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((row) => {
                      const ok = !!row.studentId && !!row.kind && !!row.date;
                      return (
                        <TableRow key={row.rowIndex} className={cn(!ok && "opacity-50")}>
                          <TableCell>
                            {ok
                              ? <IconCheck size={13} className="text-green-600 dark:text-green-400" />
                              : <IconAlertTriangle size={13} className="text-amber-500" />
                            }
                          </TableCell>
                          <TableCell className="font-mono text-xs">{row.orderNumber}</TableCell>
                          <TableCell className="text-sm">{row.rawName}</TableCell>
                          <TableCell className="text-sm">
                            {row.studentName
                              ? <>{row.studentName}{row.groupName && <span className="ml-1 text-xs text-muted-foreground">{row.groupName}</span>}</>
                              : <span className="text-muted-foreground">Не найден</span>
                            }
                          </TableCell>
                          <TableCell>
                            {row.kind
                              ? <Badge className={cn("border-transparent text-xs", RECORD_KIND_COLORS[row.kind])}>{RECORD_KIND_LABELS[row.kind]}</Badge>
                              : <span className="text-xs text-muted-foreground">—</span>
                            }
                          </TableCell>
                          <TableCell className="tabular-nums text-sm whitespace-nowrap">
                            {formatDate(row.date)}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <span className="line-clamp-2 text-sm">{row.reason}</span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {error && <ErrorBanner message={error} />}
              <div className="flex gap-2">
                <Button onClick={handleImport} disabled={loading || matched === 0} size="sm">
                  {loading ? "Импортируется…" : `Импортировать ${matched} записей`}
                </Button>
                <Button variant="ghost" size="sm" onClick={reset}>Отмена</Button>
              </div>
            </>
          )}

          {/* ── Done ──────────────────────────────────────────────────────── */}
          {step === "done" && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
                <IconCheck size={24} className="text-green-600 dark:text-green-400" />
              </div>
              <p className="font-medium">Импортировано {importedCount} записей</p>
              <Button size="sm" onClick={() => { reset(); setOpen(false); }}>Закрыть</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
      <IconX size={15} className="mt-0.5 shrink-0" />
      {message}
    </div>
  );
}
