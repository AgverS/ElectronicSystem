"use client";

import { useSearchParams } from "next/navigation";
import { translate } from "@/lib/i18n/translate";
import { useQuery } from "@tanstack/react-query";
import { Suspense, useEffect, useState, useTransition } from "react";
import { IconTrash } from "@tabler/icons-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataPagination } from "@/components/ui/data-pagination";
import { TableToolbar, type FilterConfig } from "@/components/admin/table-toolbar";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { EditSubjectDialog } from "@/components/admin/edit-subject-dialog";
import { deleteSubject } from "@/lib/actions/admin";
import { useRefresh } from "@/lib/use-refresh";
import { useTableSelection } from "@/lib/use-table-selection";

interface Specialty {
  id: string;
  name: string;
  abbreviation: string;
}

interface SubjectsTableProps {
  specialties: Specialty[];
}

interface SubjectRow {
  id: string;
  name: string;
  isPractical: boolean;
  hours: number | null;
  specialties: Specialty[];
}

function SubjectsTableInner({ specialties }: SubjectsTableProps) {
  const searchParams = useSearchParams();
  const refresh = useRefresh();
  const { selected, toggle, toggleAll, clear, isAllSelected, isIndeterminate } = useTableSelection();
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkPending, startBulkTransition] = useTransition();

  const { data, isFetching } = useQuery({
    queryKey: ["admin-subjects", searchParams.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/admin/subjects?${searchParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch subjects");
      return res.json() as Promise<{
        data: SubjectRow[];
        total: number;
        totalPages: number;
        page: number;
        limit: number;
      }>;
    },
  });

  const visibleIds = data?.data?.map((s) => s.id) ?? [];

  useEffect(() => {
    clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  function handleBulkDelete() {
    const ids = [...selected];
    startBulkTransition(async () => {
      await Promise.all(ids.map((id) => deleteSubject(id)));
      clear();
      setBulkDeleteOpen(false);
      refresh();
    });
  }

  const filters: FilterConfig[] = [
    {
      key: "specialtyId",
      placeholder: translate("term.specialty"),
      allLabel: translate("ui.allSpecialties"),
      options: specialties.map((s) => ({ value: s.id, label: s.abbreviation || s.name })),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Suspense>
        <TableToolbar searchPlaceholder={translate("ui.searchByName")} filters={filters} />
      </Suspense>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Выбрано: {selected.size}</span>
          <Button
            variant="destructive"
            size="sm"
            className="ml-auto gap-1.5"
            onClick={() => setBulkDeleteOpen(true)}
          >
            <IconTrash size={14} />
            {translate("ui.deleteSelected")}
          </Button>
        </div>
      )}

      <div
        className="rounded-md border transition-opacity"
        style={{ opacity: isFetching ? 0.6 : 1 }}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={isIndeterminate(visibleIds) ? "indeterminate" : isAllSelected(visibleIds)}
                  onCheckedChange={() => toggleAll(visibleIds)}
                  aria-label={translate("ui.selectAll")}
                />
              </TableHead>
              <TableHead>{translate("common.name")}</TableHead>
              <TableHead>{translate("nav.specialties")}</TableHead>
              <TableHead className="w-40">{translate("ui.kind")}</TableHead>
              <TableHead className="w-20 text-right">{translate("term.hours")}</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {!data?.data?.length ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-12 text-center text-muted-foreground"
                >
                  {isFetching ? translate("common.loading") : translate("ui.noSubjectsFound")}
                </TableCell>
              </TableRow>
            ) : (
              data.data.map((s) => (
                <TableRow key={s.id} data-selected={selected.has(s.id) || undefined} className="data-[selected]:bg-muted/40">
                  <TableCell>
                    <Checkbox
                      checked={selected.has(s.id)}
                      onCheckedChange={() => toggle(s.id)}
                      aria-label={translate("ui.selectNamed", { name: s.name })}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="max-w-[400px] truncate" title={s.name}>
                      {s.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    {s.specialties.length === 0 ? (
                      <span className="text-sm text-muted-foreground">—</span>
                    ) : s.specialties.length === specialties.length && specialties.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 py-1">
                        <span className="inline-flex items-center rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1 text-sm font-medium text-primary">
                          Все
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 py-1">
                        {s.specialties.map((sp) => {
                          const label = sp.abbreviation || sp.name;
                          return (
                            <span
                              key={sp.id}
                              className="inline-flex items-center rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1 text-sm font-medium max-w-[150px] truncate"
                              title={label}
                            >
                              {label}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {s.isPractical ? (
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-full">
                        {translate("lessonType.practical")}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {translate("ui.standard")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {s.hours != null ? (
                      s.hours
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <EditSubjectDialog subject={s} specialties={specialties} />
                      <DeleteDialog
                        label={translate("ui.deleteNamed", { name: s.name })}
                        action={() => deleteSubject(s.id)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.totalPages > 1 && (
        <Suspense>
          <DataPagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            limit={data.limit}
          />
        </Suspense>
      )}

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить {selected.size} предметов?</AlertDialogTitle>
            <AlertDialogDescription>{translate("ui.thisCannotBeUndone")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkPending}>{translate("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => { e.preventDefault(); handleBulkDelete(); }}
              disabled={bulkPending}
            >
              {bulkPending ? translate("ui.deleting") : translate("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function SubjectsTable(props: SubjectsTableProps) {
  return (
    <Suspense>
      <SubjectsTableInner {...props} />
    </Suspense>
  );
}
