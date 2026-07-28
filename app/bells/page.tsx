export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import type { BellContext } from "@/lib/bell-times";
import { BellsView } from "@/components/bells/bells-view";

export default async function BellsPage() {
  const [permanent, overrideRows] = await Promise.all([
    prisma.bellTime.findMany({
      orderBy: [{ dayGroup: "asc" }, { number: "asc" }],
    }),
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

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold tracking-tight mb-4">Расписание звонков</h1>
        <BellsView ctx={ctx} />
      </div>
    </div>
  );
}
