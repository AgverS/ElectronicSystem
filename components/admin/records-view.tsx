"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IconSearch, IconUser } from "@tabler/icons-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import {
  StudentRecordFormDialog,
  type RecordForForm,
} from "@/components/admin/student-record-form-dialog";
import { RecordAttachments } from "@/components/records/record-attachments";
import { cn } from "@/lib/utils";
import { RecordKind } from "@/lib/prisma-client";
import { formatCourse } from "@/lib/group-course";
import {
  RECORD_KIND_LABELS,
  RECORD_KIND_COLORS,
  formatRecordDate,
  isPenaltyExpired,
  isPenaltyWrittenOff,
} from "@/lib/records";
import {
  deleteStudentRecord,
  writeOffStudentRecord,
  cancelStudentRecordWriteOff,
} from "@/lib/actions/records";
import { WriteOffDialog } from "@/components/admin/write-off-dialog";
import { RecordsImportDialog } from "@/components/admin/records-import-dialog";

interface Student {
  id: string;
  name: string;
  group: { name: string } | null;
}

interface RecordRow {
  id: string;
  kind: RecordKind;
  number: string;
  date: string;
  reason: string;
  writtenOffAt: string | null;
  issuedBy: { name: string } | null;
  attachments: { id: string; fileName: string; mimeType: string; size: number }[];
}

type KindFilter = "" | RecordKind;

const KIND_FILTERS: { value: KindFilter; label: string }[] = [
  { value: "", label: "Все" },
  { value: RecordKind.REWARD, label: "Поощрения" },
  { value: RecordKind.PENALTY, label: "Взыскания" },
];

function StudentPicker({
  value,
  onSelect,
}: {
  value: Student | null;
  onSelect: (s: Student) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isFetching } = useQuery({
    queryKey: ["records-student-search", debounced],
    queryFn: async () => {
      const params = new URLSearchParams({ role: "STUDENT", limit: "20" });
      if (debounced) params.set("search", debounced);
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to search students");
      return res.json() as Promise<{ data: Student[] }>;
    },
    enabled: open,
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-72 justify-start gap-2">
          <IconUser size={16} className="shrink-0 text-muted-foreground" />
          <span className="truncate">
            {value ? value.name : "Выберите учащегося…"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={4} className="w-72 overflow-hidden p-0">
        <div className="border-b p-2">
          <div className="relative">
            <IconSearch
              size={14}
              className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по имени…"
              className="h-8 pl-8 text-sm"
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {isFetching && (
            <p className="py-4 text-center text-sm text-muted-foreground">Загрузка…</p>
          )}
          {!isFetching && (data?.data.length ?? 0) === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Учащиеся не найдены
            </p>
          )}
          {data?.data.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onSelect(s);
                setOpen(false);
              }}
              className="flex w-full flex-col items-start rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-foreground/10"
            >
              <span>{s.name}</span>
              {s.group && (
                <span className="text-xs text-muted-foreground">
                  {s.group.name} • {formatCourse(s.group.name)}
                </span>
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function RecordsView() {
  const queryClient = useQueryClient();
  const [student, setStudent] = useState<Student | null>(null);
  const [kind, setKind] = useState<KindFilter>("");

  const { data, isFetching } = useQuery({
    queryKey: ["admin-records", student?.id, kind],
    queryFn: async () => {
      const params = new URLSearchParams({ studentId: student!.id, limit: "100" });
      if (kind) params.set("kind", kind);
      const res = await fetch(`/api/admin/records?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch records");
      return res.json() as Promise<{ data: RecordRow[] }>;
    },
    enabled: !!student,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["admin-records"] });
  }

  const records = data?.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StudentPicker value={student} onSelect={setStudent} />
        <div className="flex items-center gap-2">
          <RecordsImportDialog onImported={invalidate} />
          {student && (
            <StudentRecordFormDialog
              mode="create"
              studentId={student.id}
              onSaved={invalidate}
            />
          )}
        </div>
      </div>

      {!student ? (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed py-16 text-center text-muted-foreground">
          <IconUser size={28} className="opacity-40" />
          <p>Выберите учащегося, чтобы увидеть его поощрения и взыскания.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            {KIND_FILTERS.map((f) => (
              <Button
                key={f.value || "all"}
                size="sm"
                variant={kind === f.value ? "secondary" : "ghost"}
                onClick={() => setKind(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>

          <div
            className="rounded-md border transition-opacity"
            style={{ opacity: isFetching ? 0.6 : 1 }}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Тип</TableHead>
                  <TableHead className="w-28">Номер</TableHead>
                  <TableHead className="w-28">Дата</TableHead>
                  <TableHead>Основание</TableHead>
                  <TableHead>Файлы</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-12 text-center text-muted-foreground"
                    >
                      {isFetching ? "Загрузка…" : "Записей нет"}
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((r) => {
                    const formRecord: RecordForForm = {
                      id: r.id,
                      kind: r.kind,
                      number: r.number,
                      date: r.date,
                      reason: r.reason,
                      attachments: r.attachments,
                    };
                    const writtenOff = isPenaltyWrittenOff(r);
                    const expired = isPenaltyExpired(r);
                    return (
                      <TableRow key={r.id} className={cn((expired || writtenOff) && "opacity-60")}>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge className={cn("border-transparent", RECORD_KIND_COLORS[r.kind])}>
                              {RECORD_KIND_LABELS[r.kind]}
                            </Badge>
                            {writtenOff ? (
                              <Badge variant="outline" className="text-muted-foreground">
                                Списано {r.writtenOffAt ? formatRecordDate(r.writtenOffAt) : ""}
                              </Badge>
                            ) : expired ? (
                              <Badge variant="outline" className="text-muted-foreground">
                                Истекла
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{r.number}</TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">
                          {formatRecordDate(r.date)}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate" title={r.reason}>
                            {r.reason}
                          </div>
                        </TableCell>
                        <TableCell>
                          <RecordAttachments attachments={r.attachments} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <StudentRecordFormDialog
                              mode="edit"
                              record={formRecord}
                              onSaved={invalidate}
                            />
                            {r.kind === RecordKind.PENALTY &&
                              (writtenOff ? (
                                <WriteOffDialog
                                  mode="cancel"
                                  action={async () => {
                                    await cancelStudentRecordWriteOff(r.id);
                                    invalidate();
                                  }}
                                />
                              ) : !expired ? (
                                <WriteOffDialog
                                  mode="writeoff"
                                  action={async () => {
                                    await writeOffStudentRecord(r.id);
                                    invalidate();
                                  }}
                                />
                              ) : null)}
                            <DeleteDialog
                              label="Удалить запись"
                              action={async () => {
                                await deleteStudentRecord(r.id);
                                invalidate();
                              }}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
