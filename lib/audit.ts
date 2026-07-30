import { prisma } from "./prisma";
import { Prisma } from "@/lib/prisma-client";

/**
 * Records an entry in the audit trail.
 *
 * The full system also captures the caller's IP address from the request
 * headers. There is no request here — everything happens in the browser — so
 * the entry records the browser instead, and the audit screen still shows a
 * real history of what the visitor has changed.
 */
export async function logAction(params: {
  userId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  meta?: Prisma.InputJsonValue | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        meta: params.meta ?? Prisma.JsonNull,
        ipAddress: null,
        userAgent: typeof navigator === "undefined" ? null : navigator.userAgent,
      },
    });
  } catch {
    // Audit logging must never fail the operation it is recording.
  }
}
