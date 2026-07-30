import { prisma } from "@/lib/prisma";
import { toISODate } from "@/lib/week";
import type { BellContext } from "@/lib/bell-times";

/** Builds the bell-times context straight from the demo database. */
export async function loadBellContext(): Promise<BellContext> {
  const [permanent, overrides] = await Promise.all([
    prisma.bellTime.findMany({ orderBy: [{ dayGroup: "asc" }, { number: "asc" }] }),
    prisma.bellOverride.findMany({
      include: { slots: { orderBy: { number: "asc" } } },
      orderBy: { startDate: "asc" },
    }),
  ]);

  return {
    permanent: permanent.map((row) => ({
      dayGroup: row.dayGroup,
      number: row.number,
      startTime: row.startTime,
      endTime: row.endTime,
    })),
    overrides: overrides.map((row) => ({
      startDate: toISODate(row.startDate),
      endDate: toISODate(row.endDate),
      slots: row.slots.map((s) => ({
        number: s.number,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
    })),
  };
}
