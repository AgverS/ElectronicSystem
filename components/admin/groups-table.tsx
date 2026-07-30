"use client";

import { useSearchParams } from "next/navigation";
import { translate } from "@/lib/i18n/translate";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { TableToolbar } from "@/components/admin/table-toolbar";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { EditGroupDialog } from "@/components/admin/edit-group-dialog";
import { ViewGroupDialog } from "@/components/admin/view-group-dialog";
import { deleteGroup } from "@/lib/actions/admin";
import { formatCourse } from "@/lib/group-course";
import { shortName } from "@/lib/utils";

// Подбирает специальность по первой букве названия группы (Specialty.letter).
function specialtyByLetter<T extends { letter: string }>(
  name: string,
  specialties: T[],
): T | null {
  const letter = name.trim().charAt(0).toUpperCase();
  if (!letter) return null;
  return (
    specialties.find((s) => s.letter && s.letter.toUpperCase() === letter) ??
    null
  );
}
import { useTableSelection } from "@/lib/use-table-selection";

interface GroupsTableProps {
  teachers: { id: string; name: string }[];
  specialties: { id: string; name: string; abbreviation: string; letter: string }[];
  hideSpecialty?: boolean;
}

function GroupsTableInner({ teachers, specialties, hideSpecialty }: GroupsTableProps) {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { selected, toggle, toggleAll, clear, isAllSelected, isIndeterminate } = useTableSelection();
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkPending, startBulkTransition] = useTransition();

  const { data, isFetching } = useQuery({
    queryKey: ["admin-groups", searchParams.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/admin/groups?${searchParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch groups");
      return res.json() as Promise<{
        data: {
          id: string;
          name: string;
          year: number;
          curatorId: string | null;
          specialtyId: string | null;
          curator: { name: string } | null;
          specialty: { name: string; abbreviation: string } | null;
          students: { id: string }[];
        }[];
        total: number;
        totalPages: number;
        page: number;
        limit: number;
      }>;
    },
  });

  const visibleIds = data?.data?.map((g) => g.id) ?? [];

  useEffect(() => {
    clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  function handleBulkDelete() {
    const ids = [...selected];
    startBulkTransition(async () => {
      await Promise.all(ids.map((id) => deleteGroup(id)));
      clear();
      setBulkDeleteOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-groups"] });
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Suspense>
        <TableToolbar searchPlaceholder={translate("ui.searchByNameOrCurator")} />
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
              {!hideSpecialty && <TableHead>{translate("term.specialty")}</TableHead>}
              <TableHead>{translate("term.course")}</TableHead>
              <TableHead>{translate("term.curator")}</TableHead>
              <TableHead>{translate("term.students")}</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {!data?.data?.length ? (
              <TableRow>
                <TableCell
                  colSpan={hideSpecialty ? 6 : 7}
                  className="py-12 text-center text-muted-foreground"
                >
                  {isFetching ? translate("common.loading") : translate("ui.noGroupsFound2")}
                </TableCell>
              </TableRow>
            ) : (
              data.data.map((g) => (
                <TableRow key={g.id} data-selected={selected.has(g.id) || undefined} className="data-[selected]:bg-muted/40">
                  <TableCell>
                    <Checkbox
                      checked={selected.has(g.id)}
                      onCheckedChange={() => toggle(g.id)}
                      aria-label={translate("ui.selectNamed", { name: g.name })}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{g.name}</TableCell>
                  {!hideSpecialty && (
                    <TableCell className="text-muted-foreground text-sm">
                      {(() => {
                        const sp =
                          g.specialty ?? specialtyByLetter(g.name, specialties);
                        const label = sp?.abbreviation || sp?.name || "-";
                        return (
                          <div className="max-w-[200px] truncate" title={label}>
                            {label}
                          </div>
                        );
                      })()}
                    </TableCell>
                  )}
                  <TableCell>{formatCourse(g.name)}</TableCell>
                  <TableCell>
                    <div className="max-w-[200px] truncate" title={g.curator?.name ?? "-"}>
                      {g.curator ? (
                        <>
                          <span className="sm:hidden">{shortName(g.curator.name)}</span>
                          <span className="hidden sm:inline">{g.curator.name}</span>
                        </>
                      ) : (
                        "-"
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{g.students.length}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <ViewGroupDialog groupId={g.id} groupName={g.name} />
                      <EditGroupDialog
                        group={{
                          id: g.id,
                          name: g.name,
                          curatorId: g.curatorId,
                          specialtyId: g.specialtyId,
                        }}
                        teachers={teachers}
                        specialties={specialties}
                      />
                      <DeleteDialog
                        label={translate("ui.deleteNamed", { name: g.name })}
                        action={async () => {
                          await deleteGroup(g.id);
                          await queryClient.invalidateQueries({
                            queryKey: ["admin-groups"],
                          });
                        }}
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
            <AlertDialogTitle>Удалить {selected.size} групп?</AlertDialogTitle>
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

export function GroupsTable(props: GroupsTableProps) {
  return (
    <Suspense>
      <GroupsTableInner {...props} />
    </Suspense>
  );
}
