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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataPagination } from "@/components/ui/data-pagination";
import { TableToolbar } from "@/components/admin/table-toolbar";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { EditSemesterDialog } from "@/components/admin/edit-semester-dialog";
import { deleteSemester } from "@/lib/actions/admin";
import { useRefresh } from "@/lib/use-refresh";
import { useTableSelection } from "@/lib/use-table-selection";

function fmt(d: string | Date) {
  return new Date(d).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function SemestersTableInner() {
  const searchParams = useSearchParams();
  const refresh = useRefresh();
  const { selected, toggle, toggleAll, clear, isAllSelected, isIndeterminate } = useTableSelection();
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkPending, startBulkTransition] = useTransition();

  const { data, isFetching } = useQuery({
    queryKey: ["admin-semesters", searchParams.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/admin/semesters?${searchParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch semesters");
      return res.json() as Promise<{
        data: {
          id: string;
          name: string;
          number: number;
          year: string;
          startDate: string;
          endDate: string;
          isCurrent: boolean;
        }[];
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
      await Promise.all(ids.map((id) => deleteSemester(id)));
      clear();
      setBulkDeleteOpen(false);
      refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Suspense>
        <TableToolbar searchPlaceholder={translate("ui.searchByName")} />
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
              <TableHead>{translate("bells.start")}</TableHead>
              <TableHead>{translate("bells.end")}</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {!data?.data?.length ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                  {isFetching ? translate("common.loading") : translate("ui.noSemestersFound")}
                </TableCell>
              </TableRow>
            ) : (
              data.data.map((s) => (
                <TableRow key={s.id} data-selected={selected.has(s.id) || undefined} className="data-[selected]:bg-muted/40">
                  <TableCell>
                    <Checkbox
                      checked={selected.has(s.id)}
                      onCheckedChange={() => toggle(s.id)}
                      aria-label={`Выбрать ${s.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2 max-w-[250px]">
                      <span className="truncate" title={s.name}>
                        {s.name}
                      </span>
                      {s.isCurrent && (
                        <Badge
                          variant="outline"
                          className="shrink-0 text-[10px] bg-primary/10 text-primary border-primary/20"
                        >
                          {translate("ui.current")}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{fmt(s.startDate)}</TableCell>
                  <TableCell>{fmt(s.endDate)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <EditSemesterDialog
                        semester={{
                          ...s,
                          startDate: new Date(s.startDate),
                          endDate: new Date(s.endDate),
                        }}
                      />
                      <DeleteDialog
                        label={`Удалить «${s.name}»`}
                        action={() => deleteSemester(s.id)}
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
            <AlertDialogTitle>Удалить {selected.size} семестров?</AlertDialogTitle>
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

export function SemestersTable() {
  return (
    <Suspense>
      <SemestersTableInner />
    </Suspense>
  );
}
