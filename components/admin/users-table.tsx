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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataPagination } from "@/components/ui/data-pagination";
import { TableToolbar } from "@/components/admin/table-toolbar";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { EditUserDialog } from "@/components/admin/edit-user-dialog";
import { ResetPasswordDialog } from "@/components/admin/reset-password-dialog";
import { UserDetailsDialog } from "@/components/admin/user-details-dialog";
import { deleteUser } from "@/lib/actions/admin";
import { formatCourse } from "@/lib/group-course";
import { Role } from "@/lib/prisma-client";
import { useTableSelection } from "@/lib/use-table-selection";

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: translate("landing.role.admin.title"),
  TEACHER: translate("landing.role.teacher.title"),
  STUDENT: translate("landing.role.student.title"),
};

const ROLE_VARIANTS: Record<Role, "default" | "secondary" | "outline"> = {
  ADMIN: "default",
  TEACHER: "secondary",
  STUDENT: "outline",
};

export interface UsersTableProps {
  groups: { id: string; name: string }[];
  specialties: { id: string; name: string; abbreviation: string }[];
  currentUserId: string;
  isMasterActor: boolean;
  hideSpecialty?: boolean;
  lockedRoles?: Role[];
}

function UsersTableInner({
  groups,
  specialties,
  currentUserId,
  isMasterActor,
  hideSpecialty,
  lockedRoles,
}: UsersTableProps) {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { selected, toggle, toggleAll, clear, isAllSelected, isIndeterminate } = useTableSelection();
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkPending, startBulkTransition] = useTransition();

  const showRole = !lockedRoles || lockedRoles.length > 1;
  const showGroup = !lockedRoles || lockedRoles.includes(Role.STUDENT);
  const showSpecialties =
    (!lockedRoles || !lockedRoles.every((r) => r === Role.STUDENT)) &&
    !hideSpecialty;
  const colCount = 4 + (showRole ? 1 : 0) + (showGroup ? 2 : 0) + (showSpecialties ? 1 : 0); // checkbox + data cols (group counts as 2) + actions

  const { data, isFetching } = useQuery({
    queryKey: ["admin-users", searchParams.toString(), lockedRoles?.join(",") ?? ""],
    queryFn: async () => {
      const params = new URLSearchParams(searchParams.toString());
      if (lockedRoles) {
        params.delete("role");
        params.set("roles", lockedRoles.join(","));
      }
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json() as Promise<{
        data: {
          id: string;
          name: string;
          username: string | null;
          role: Role;
          groupId: string | null;
          group: { name: string } | null;
          specialties: { id: string; name: string; abbreviation: string }[];
          subjects: { id: string; name: string }[];
          curatedGroups: { id: string }[];
        }[];
        total: number;
        totalPages: number;
        page: number;
        limit: number;
      }>;
    },
  });

  function canModify(u: NonNullable<typeof data>["data"][number]) {
    if (isMasterActor) return true;
    return u.id !== currentUserId && u.role !== Role.ADMIN;
  }

  const visibleIds = data?.data?.filter(canModify).map((u) => u.id) ?? [];

  useEffect(() => {
    clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString(), lockedRoles?.join(",")]);

  function handleBulkDelete() {
    const ids = [...selected];
    startBulkTransition(async () => {
      await Promise.all(ids.map((id) => deleteUser(id)));
      clear();
      setBulkDeleteOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    });
  }

  const roleFilter = lockedRoles
    ? []
    : [
      {
        key: "role",
        placeholder: translate("ui.role"),
        allLabel: translate("ui.allRoles"),
        options: [
          { value: Role.ADMIN, label: translate("landing.role.admin.title") },
          { value: Role.TEACHER, label: translate("landing.role.teacher.title") },
          { value: Role.STUDENT, label: translate("landing.role.student.title") },
        ],
      },
    ];

  const groupFilter = showGroup
    ? [
      {
        key: "groupId",
        placeholder: translate("term.group"),
        allLabel: translate("ui.allGroups"),
        options: groups.map((g) => ({ value: g.id, label: g.name })),
      },
    ]
    : [];

  return (
    <div className="flex flex-col gap-4">
      <Suspense>
        <TableToolbar
          searchPlaceholder={translate("ui.searchByNameOrUsername")}
          filters={[...roleFilter, ...groupFilter]}
        />
      </Suspense>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm">
          <span className="text-muted-foreground">{translate("ui.selectedN", { count: selected.size })}</span>
          <Button
            variant="destructive"
            size="sm"
            className="ml-auto gap-1.5"
            onClick={() => setBulkDeleteOpen(true)}
          >
            <IconTrash size={14} />
            {translate("ui.deleteSelected2")}
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
              <TableHead>{translate("ui.fullName")}</TableHead>
              <TableHead>{translate("ui.username")}</TableHead>
              {showRole && <TableHead>{translate("ui.role")}</TableHead>}
              {showGroup && (
                <>
                  <TableHead>{translate("term.group")}</TableHead>
                  <TableHead>{translate("term.course")}</TableHead>
                </>
              )}
              {showSpecialties && <TableHead>{translate("nav.specialties")}</TableHead>}
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {!data?.data?.length ? (
              <TableRow>
                <TableCell
                  colSpan={colCount}
                  className="py-12 text-center text-muted-foreground"
                >
                  {isFetching ? translate("common.loading") : translate("ui.noPeopleFound")}
                </TableCell>
              </TableRow>
            ) : (
              data.data.map((u) => (
                <TableRow key={u.id} data-selected={selected.has(u.id) || undefined} className="data-[selected]:bg-muted/40">
                  <TableCell>
                    {canModify(u) && (
                      <Checkbox
                        checked={selected.has(u.id)}
                        onCheckedChange={() => toggle(u.id)}
                        aria-label={translate("ui.selectNamed", { name: u.name })}
                      />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    <UserDetailsDialog
                      userId={u.id}
                      userName={u.name}
                      trigger={
                        <button
                          type="button"
                          className="max-w-[250px] truncate text-left font-medium hover:text-primary transition-colors cursor-pointer select-none"
                          title={u.name}
                        >
                          {u.name}
                        </button>
                      }
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {u.username}
                  </TableCell>
                  {showRole && (
                    <TableCell>
                      <Badge variant={ROLE_VARIANTS[u.role]}>
                        {ROLE_LABELS[u.role]}
                      </Badge>
                    </TableCell>
                  )}
                  {showGroup && (
                    <>
                      <TableCell>
                        <div className="max-w-[120px] truncate" title={u.group?.name ?? "-"}>
                          {u.group?.name ?? "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {u.group ? formatCourse(u.group.name) : "-"}
                      </TableCell>
                    </>
                  )}
                  {showSpecialties && (
                    <TableCell>
                      {u.specialties.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <div
                          className="max-w-[200px] truncate text-sm"
                          title={u.specialties.map((s) => s.abbreviation || s.name).join(", ")}
                        >
                          {u.specialties.map((s) => s.abbreviation || s.name).join(", ")}
                        </div>
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <UserDetailsDialog userId={u.id} userName={u.name} />
                      {canModify(u) && (
                        <ResetPasswordDialog userId={u.id} userName={u.name} />
                      )}
                      {canModify(u) && (
                        <EditUserDialog
                          user={u}
                          groups={groups}
                          specialties={specialties}
                          isMasterActor={isMasterActor}
                        />
                      )}
                      {canModify(u) && (
                        <DeleteDialog
                          label={translate("ui.deleteNamed", { name: u.name })}
                          action={async () => {
                            await deleteUser(u.id);
                            await queryClient.invalidateQueries({
                              queryKey: ["admin-users"],
                            });
                          }}
                        />
                      )}
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
            <AlertDialogTitle>{translate("ui.deleteNUsers", { count: selected.size })}</AlertDialogTitle>
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

export function UsersTable(props: UsersTableProps) {
  return (
    <Suspense>
      <UsersTableInner {...props} />
    </Suspense>
  );
}
