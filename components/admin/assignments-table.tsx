"use client";

import { useSearchParams } from "next/navigation";
import { translate } from "@/lib/i18n/translate";
import { useQuery } from "@tanstack/react-query";
import { Suspense, useState, useTransition } from "react";
import { IconX, IconPencil, IconTrash } from "@tabler/icons-react";
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
import { DataPagination } from "@/components/ui/data-pagination";
import { TableToolbar, type FilterConfig } from "@/components/admin/table-toolbar";
import { deleteAssignment, deleteAssignments } from "@/lib/actions/admin";
import { useRefresh } from "@/lib/use-refresh";
import {
  EditAssignmentDialog,
  type EditAssignmentData,
} from "@/components/admin/edit-assignment-dialog";

interface AssignmentsTableProps {
  teachers: { id: string; name: string }[];
  groups: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
}

interface AssignmentRow {
  key: string;
  teacherName: string;
  subjectName: string;
  subjectId: string;
  groups: {
    assignmentId: string;
    groupId: string;
    groupName: string;
    teachers: { id: string; name: string }[];
  }[];
}

function AssignmentsTableInner({ teachers, groups, subjects }: AssignmentsTableProps) {
  const searchParams = useSearchParams();
  const refresh = useRefresh();
  const [pending, startTransition] = useTransition();
  const [toDelete, setToDelete] = useState<{ id: string; label: string } | null>(null);
  const [toDeleteRow, setToDeleteRow] = useState<{ ids: string[]; label: string } | null>(null);
  const [editing, setEditing] = useState<EditAssignmentData | null>(null);

  const { data, isFetching } = useQuery({
    queryKey: ["admin-assignments", searchParams.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/admin/assignments?${searchParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch assignments");
      return res.json() as Promise<{
        data: AssignmentRow[];
        total: number;
        totalPages: number;
        page: number;
        limit: number;
      }>;
    },
  });

  function confirmDelete() {
    if (!toDelete) return;
    const id = toDelete.id;
    startTransition(async () => {
      await deleteAssignment(id);
      refresh();
      setToDelete(null);
    });
  }

  function confirmDeleteRow() {
    if (!toDeleteRow) return;
    const ids = toDeleteRow.ids;
    startTransition(async () => {
      await deleteAssignments(ids);
      refresh();
      setToDeleteRow(null);
    });
  }

  const filters: FilterConfig[] = [
    {
      key: "teacherId",
      placeholder: translate("landing.role.teacher.title"),
      allLabel: translate("ui.allTeachers"),
      options: teachers.map((t) => ({ value: t.id, label: t.name })),
    },
    {
      key: "groupId",
      placeholder: translate("term.group"),
      allLabel: translate("ui.allGroups"),
      options: groups.map((g) => ({ value: g.id, label: g.name })),
    },
    {
      key: "subjectId",
      placeholder: translate("term.subject"),
      allLabel: translate("ui.allSubjects"),
      options: subjects.map((s) => ({ value: s.id, label: s.name })),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Suspense>
        <TableToolbar
          searchPlaceholder={translate("ui.searchByTeacherGroupOrSubject")}
          filters={filters}
        />
      </Suspense>

      <div
        className="rounded-md border transition-opacity"
        style={{ opacity: isFetching ? 0.6 : 1 }}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{translate("landing.role.teacher.title")}</TableHead>
              <TableHead>{translate("term.subject")}</TableHead>
              <TableHead>{translate("nav.groups")}</TableHead>
              <TableHead className="w-[1%]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {!data?.data?.length ? (
              <TableRow>
                <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                  {isFetching ? translate("common.loading") : translate("ui.noAssignmentsFound")}
                </TableCell>
              </TableRow>
            ) : (
              data.data.map((row) => (
                <TableRow key={row.key}>
                  <TableCell className="align-top font-medium">
                    <div className="max-w-[250px] truncate" title={row.teacherName}>
                      {row.teacherName}
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="max-w-[400px] truncate" title={row.subjectName}>
                      {row.subjectName}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2 py-1">
                      {row.groups.map((g) => (
                        <span
                          key={g.assignmentId}
                          className="group/chip inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 py-1 pl-2.5 pr-1 text-sm font-medium tabular-nums transition-colors hover:border-border hover:bg-muted/70"
                        >
                          {g.groupName}
                          <button
                            type="button"
                            aria-label={translate("ui.deleteNamed", { name: g.groupName })}
                            onClick={() =>
                              setToDelete({
                                id: g.assignmentId,
                                label: `${row.teacherName} · ${row.subjectName} · ${g.groupName}`,
                              })
                            }
                            className="flex size-4 items-center justify-center rounded-md text-transparent transition-colors group-hover/chip:text-muted-foreground/60 hover:bg-destructive/10! hover:text-destructive!"
                          >
                            <IconX size={12} stroke={2.5} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        aria-label={translate("ui.editTheAssignment")}
                        onClick={() =>
                          setEditing({
                            subjectId: row.subjectId,
                            subjectName: row.subjectName,
                            prevAssignmentIds: row.groups.map((g) => g.assignmentId),
                            teacherIds: row.groups[0]?.teachers.map((t) => t.id) ?? [],
                            groupIds: row.groups.map((g) => g.groupId),
                          })
                        }
                        className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <IconPencil size={15} stroke={2} />
                      </button>
                      <button
                        type="button"
                        aria-label={translate("ui.deleteTheAssignmentEntirely2")}
                        onClick={() =>
                          setToDeleteRow({
                            ids: row.groups.map((g) => g.assignmentId),
                            label: `${row.teacherName} · ${row.subjectName}`,
                          })
                        }
                        className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <IconTrash size={15} stroke={2} />
                      </button>
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

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{translate("ui.deleteTheAssignment")}</AlertDialogTitle>
            <AlertDialogDescription>
              {translate("assignment.deleteConfirm", { label: toDelete?.label ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{translate("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={pending}
            >
              {pending ? translate("ui.deleting") : translate("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!toDeleteRow} onOpenChange={(open) => !open && setToDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{translate("ui.deleteTheAssignmentEntirely")}</AlertDialogTitle>
            <AlertDialogDescription>
              {toDeleteRow?.label}
              {toDeleteRow && toDeleteRow.ids.length > 1
                ? translate("assignment.deleteGroupsCount", { count: toDeleteRow.ids.length })
                : ""}
              {translate("assignment.deleteAllGroups")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{translate("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                confirmDeleteRow();
              }}
              disabled={pending}
            >
              {pending ? translate("ui.deleting") : translate("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditAssignmentDialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        data={editing}
        teachers={teachers}
        groups={groups}
      />
    </div>
  );
}

export function AssignmentsTable(props: AssignmentsTableProps) {
  return (
    <Suspense>
      <AssignmentsTableInner {...props} />
    </Suspense>
  );
}
