"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LogsFilters } from "@/components/admin/logs-filters";
import { MetaButton } from "@/components/admin/meta-button";
import { PageLoading } from "@/components/ui/page-state";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/prisma-client";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useDemoData } from "@/lib/use-demo-data";
import { useI18n, useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

/**
 * Badge colour follows the verb the action starts with, rather than a per-action
 * table: creations read blue, changes amber, removals red. One rule covers every
 * action, including any added later.
 */
function actionClasses(action: string): string {
  if (action.startsWith("CREATE_") || action.startsWith("ADD_"))
    return "bg-blue-500/10 text-blue-600 border-blue-500/20";
  if (action.startsWith("DELETE_") || action.startsWith("RESET_"))
    return "bg-red-500/10 text-red-600 border-red-500/20";
  if (
    action.startsWith("UPDATE_") ||
    action.startsWith("UPSERT_") ||
    action.startsWith("SET_") ||
    action.startsWith("SAVE_") ||
    action.startsWith("WRITE_OFF_") ||
    action.startsWith("CANCEL_")
  )
    return "bg-amber-500/10 text-amber-600 border-amber-500/20";
  if (action === "LOGIN") return "bg-green-500/10 text-green-600 border-green-500/20";
  if (action === "LOGOUT") return "bg-slate-500/10 text-slate-500 border-slate-500/20";
  return "border-border text-foreground";
}

function buildWhere(
  action: string,
  entity: string,
  search: string,
  dateFrom: string,
  dateTo: string,
): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = { user: { isMaster: false } };

  if (action) where.action = action;
  if (entity) where.entity = entity;

  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}),
    };
  }

  if (search) {
    where.OR = [
      { user: { name: { contains: search, mode: "insensitive" } } },
      { user: { username: { contains: search, mode: "insensitive" } } },
      { ipAddress: { contains: search } },
      { entityId: { contains: search, mode: "insensitive" } },
    ];
  }

  return where;
}

export default function LogsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <LogsPageContent />
    </Suspense>
  );
}

function LogsPageContent() {
  const searchParams = useSearchParams();
  const t = useT();
  const { intlLocale } = useI18n();

  const action = searchParams.get("action") ?? "";
  const entity = searchParams.get("entity") ?? "";
  const search = searchParams.get("search") ?? "";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") ?? "50", 10) || 50));
  const skip = (page - 1) * limit;

  const { data, loading } = useDemoData(
    ["admin-logs", action, entity, search, dateFrom, dateTo, page, limit],
    async () => {
      const where = buildWhere(action, entity, search, dateFrom, dateTo);
      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          include: { user: { select: { name: true, username: true, role: true } } },
        }),
        prisma.auditLog.count({ where }),
      ]);
      return { logs, total };
    },
  );

  const formatDate = (d: Date) =>
    new Intl.DateTimeFormat(intlLocale, {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(d);

  const total = data?.total ?? 0;
  const logs = data?.logs ?? [];
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const pageUrl = (target: number) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("page", String(target));
    return `/admin/logs/?${next.toString()}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("nav.logs")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("audit.entryCount", { count: total.toLocaleString(intlLocale) })}
          </p>
        </div>
      </div>

      <Suspense>
        <LogsFilters />
      </Suspense>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-36">{t("common.time")}</TableHead>
              <TableHead className="w-44">{t("audit.user")}</TableHead>
              <TableHead className="w-44">{t("audit.action")}</TableHead>
              <TableHead className="w-32">{t("audit.entity")}</TableHead>
              <TableHead className="w-28">{t("audit.ip")}</TableHead>
              <TableHead>{t("audit.userAgent")}</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <PageLoading />
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  {t("audit.empty")}
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => {
                const meta = log.meta as Record<string, unknown> | null;
                return (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {formatDate(log.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium leading-none">{log.user.name}</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {log.user.username}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={actionClasses(log.action)}>
                        {t(`audit.action.${log.action}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm">{t(`audit.entity.${log.entity}`)}</span>
                        {log.entityId && (
                          <span className="font-mono text-xs text-muted-foreground">
                            {log.entityId.slice(0, 8)}…
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.ipAddress ?? "—"}</TableCell>
                    <TableCell
                      className="max-w-48 truncate text-xs text-muted-foreground"
                      title={log.userAgent ?? ""}
                    >
                      {log.userAgent ? log.userAgent.replace(/Mozilla\/[\d.]+\s*/, "") : "—"}
                    </TableCell>
                    <TableCell>
                      {meta && Object.keys(meta).length > 0 ? <MetaButton meta={meta} /> : null}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <p className="text-muted-foreground">
          {t("common.page", { page, total: totalPages })}
          {total > 0 && ` · ${skip + 1}–${Math.min(skip + limit, total)} / ${total}`}
        </p>
        <div className="flex items-center gap-1">
          {page > 1 && (
            <Link
              href={pageUrl(page - 1)}
              className="flex h-8 items-center gap-1 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <IconChevronLeft size={14} />
              {t("common.previous")}
            </Link>
          )}

          {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
            const first =
              totalPages <= 7 ? 1 : page <= 4 ? 1 : page >= totalPages - 3 ? totalPages - 6 : page - 3;
            return first + i;
          }).map((p) => (
            <Link
              key={p}
              href={pageUrl(p)}
              className={cn(
                "flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm transition-colors hover:bg-muted",
                p === page ? "bg-muted font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {p}
            </Link>
          ))}

          {page < totalPages && (
            <Link
              href={pageUrl(page + 1)}
              className="flex h-8 items-center gap-1 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {t("common.next")}
              <IconChevronRight size={14} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
