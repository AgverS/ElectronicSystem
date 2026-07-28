import { headers } from "next/headers";
import { prisma } from "./prisma";
import { Prisma } from "@/lib/prisma-client";

export async function logAction(params: {
  userId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  meta?: Prisma.InputJsonValue | null;
}) {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    const ip = forwarded
      ? forwarded.split(",")[0].trim()
      : (h.get("x-real-ip") ?? null);
    const ua = h.get("user-agent") ?? null;

    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        meta: params.meta ?? Prisma.JsonNull,
        ipAddress: ip,
        userAgent: ua,
      },
    });
  } catch {
    // audit logging must never fail the main operation
  }
}
