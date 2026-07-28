import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { BellContext } from "@/lib/bell-times";

export async function GET() {
  const [permanent, overrideRows] = await Promise.all([
    prisma.bellTime.findMany({ orderBy: [{ dayGroup: "asc" }, { number: "asc" }] }),
    prisma.bellOverride.findMany({
      include: { slots: { orderBy: { number: "asc" } } },
      orderBy: { startDate: "asc" },
    }),
  ]);

  const ctx: BellContext = {
    permanent,
    overrides: overrideRows.map((o) => ({
      startDate: o.startDate.toISOString().slice(0, 10),
      endDate: o.endDate.toISOString().slice(0, 10),
      slots: o.slots,
    })),
  };

  return NextResponse.json(ctx);
}
